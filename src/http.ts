import {
  AwsysAuthError,
  AwsysConflictError,
  AwsysError,
  AwsysForbiddenError,
  AwsysNetworkError,
  AwsysNotFoundError,
  AwsysRateLimitError,
  AwsysServerError,
  AwsysTimeoutError,
  AwsysValidationError,
} from "./errors.js";
import { SDK_VERSION } from "./version.js";

const runtimeVersion = typeof process !== "undefined" ? process.version : "unknown";
const USER_AGENT = `awsysco-ts-sdk/${SDK_VERSION} (node/${runtimeVersion})`;

interface ErrorBody {
  // The AWSYS API uses `error: true` (boolean) as a flag, or a string used
  // directly as the message; `success: false` is a third documented shape.
  error?: boolean | string;
  success?: boolean;
  code?: string;
  message?: string;
  resetsAt?: string;
}

/** Statuses/methods that retry a plain 429 always apply to; see below for 5xx. */
const QUOTA_CODES = new Set([
  "HOURLY_LIMIT_EXCEEDED",
  "DAILY_LIMIT_EXCEEDED",
  "MONTHLY_LIMIT_EXCEEDED",
]);

/** 5xx statuses and transport errors are only retried for idempotent methods. */
const IDEMPOTENT_METHODS = new Set(["GET", "PUT", "DELETE"]);
const RETRYABLE_5XX = new Set([502, 503, 504]);

const DEFAULT_MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;
const DEFAULT_TIMEOUT_MS = 30000;

function jitteredBackoffMs(attempt: number): number {
  const base = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
  return Math.random() * base;
}

/**
 * Parses a `Retry-After` header value as either plain seconds or an HTTP-date,
 * returning the delay in milliseconds from now.
 */
function parseRetryAfterDelayMs(value: string | null): number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const seconds = Number(trimmed);
  if (!Number.isNaN(seconds)) {
    return Math.max(0, seconds * 1000);
  }
  const dateMs = Date.parse(trimmed);
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }
  return undefined;
}

function parseRetryAfterSeconds(value: string | null): number | undefined {
  const ms = parseRetryAfterDelayMs(value);
  return ms === undefined ? undefined : Math.round(ms / 1000);
}

async function parseErrorBody(response: Response): Promise<ErrorBody> {
  try {
    return (await response.json()) as ErrorBody;
  } catch {
    // Non-JSON body (HTML error page, empty body, etc.) — fall back to {}
    // and let resolveMessage() use the HTTP status text instead.
    return {};
  }
}

function resolveMessage(
  body: ErrorBody,
  status: number,
  statusText: string,
): string {
  if (typeof body.error === "string") return body.error;
  if (body.message) return body.message;
  if (body.code) return `Request failed with code ${body.code}`;
  if (statusText) return `HTTP ${status} ${statusText}`;
  return `HTTP ${status} error`;
}

function throwForStatus(
  status: number,
  body: ErrorBody,
  raw: unknown,
  retryAfterHeader: string | null,
  statusText: string,
): never {
  const message = resolveMessage(body, status, statusText);
  const code = body.code ?? String(status);

  switch (status) {
    case 400:
      throw new AwsysValidationError(message, code, raw);
    case 401:
      throw new AwsysAuthError(message, code, raw);
    case 403:
      throw new AwsysForbiddenError(message, code, raw);
    case 404:
      throw new AwsysNotFoundError(message, code, raw);
    case 409:
      throw new AwsysConflictError(message, code, raw);
    case 429:
      throw new AwsysRateLimitError(
        message,
        code,
        raw,
        parseRetryAfterSeconds(retryAfterHeader),
        body.resetsAt,
      );
    default:
      if (status >= 500) {
        throw new AwsysServerError(message, status, code, raw);
      }
      throw new AwsysError(message, status, code, raw);
  }
}

export class HttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly maxRetries: number;
  private readonly defaultTimeoutMs: number;

  constructor(
    apiKey: string,
    baseUrl: string,
    maxRetries?: number,
    timeoutMs?: number,
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.maxRetries = maxRetries ?? DEFAULT_MAX_RETRIES;
    this.defaultTimeoutMs = timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    };
  }

  private buildUrl(path: string, params?: Record<string, string | number>): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  /**
   * Shared fetch + timeout + retry + error-mapping core used by every HTTP
   * verb. `parseSuccess` decides how to turn a 2xx `Response` into `T`
   * (JSON body vs. raw text).
   */
  private async performRequest<T>(
    method: string,
    url: string,
    headers: Record<string, string>,
    requestBody: unknown,
    timeoutMs: number,
    externalSignal: AbortSignal | undefined,
    parseSuccess: (response: Response) => Promise<T>,
  ): Promise<T> {
    let attempt = 0;

    while (true) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const onExternalAbort = () => controller.abort();
      if (externalSignal) {
        if (externalSignal.aborted) controller.abort();
        else externalSignal.addEventListener("abort", onExternalAbort, { once: true });
      }

      let response: Response;
      try {
        response = await fetch(url, {
          method,
          headers,
          body: requestBody !== undefined ? JSON.stringify(requestBody) : undefined,
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timer);
        if (externalSignal) externalSignal.removeEventListener("abort", onExternalAbort);

        const isAbort = err instanceof Error && err.name === "AbortError";
        if (isAbort) {
          // Our own timeout fired (or the caller's signal aborted). Timeouts
          // are not auto-retried — the caller already waited the full budget.
          throw new AwsysTimeoutError(
            `Request timed out after ${timeoutMs}ms`,
            "TIMEOUT",
            err,
          );
        }

        const message = err instanceof Error ? err.message : "Network error";
        if (IDEMPOTENT_METHODS.has(method) && attempt < this.maxRetries) {
          await sleep(jitteredBackoffMs(attempt));
          attempt++;
          continue;
        }
        throw new AwsysNetworkError(message, "NETWORK_ERROR", err);
      }

      clearTimeout(timer);
      if (externalSignal) externalSignal.removeEventListener("abort", onExternalAbort);

      if (response.ok) {
        return parseSuccess(response);
      }

      const body = await parseErrorBody(response);
      const retryAfterHeader = response.headers.get("Retry-After");
      const isQuota429 = response.status === 429 && QUOTA_CODES.has(body.code ?? "");

      if (response.status === 429 && !isQuota429 && attempt < this.maxRetries) {
        await sleep(parseRetryAfterDelayMs(retryAfterHeader) ?? jitteredBackoffMs(attempt));
        attempt++;
        continue;
      }

      if (
        RETRYABLE_5XX.has(response.status) &&
        IDEMPOTENT_METHODS.has(method) &&
        attempt < this.maxRetries
      ) {
        await sleep(parseRetryAfterDelayMs(retryAfterHeader) ?? jitteredBackoffMs(attempt));
        attempt++;
        continue;
      }

      throwForStatus(response.status, body, body, retryAfterHeader, response.statusText);
    }
  }

  async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      params?: Record<string, string | number>;
      signal?: AbortSignal;
      timeoutMs?: number;
    },
  ): Promise<T> {
    const url = this.buildUrl(path, options?.params);
    const headers = this.buildHeaders();
    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;

    return this.performRequest<T>(
      method,
      url,
      headers,
      options?.body,
      timeoutMs,
      options?.signal,
      async (response) => {
        if (response.status === 204) {
          return undefined as unknown as T;
        }
        return (await response.json()) as T;
      },
    );
  }

  get<T>(
    path: string,
    params?: Record<string, string | number>,
    options?: { signal?: AbortSignal; timeoutMs?: number },
  ): Promise<T> {
    return this.request<T>("GET", path, { params, ...options });
  }

  post<T>(
    path: string,
    body?: unknown,
    options?: { signal?: AbortSignal; timeoutMs?: number },
  ): Promise<T> {
    return this.request<T>("POST", path, { body, ...options });
  }

  patch<T>(
    path: string,
    body?: unknown,
    options?: { signal?: AbortSignal; timeoutMs?: number },
  ): Promise<T> {
    return this.request<T>("PATCH", path, { body, ...options });
  }

  delete<T>(
    path: string,
    options?: { signal?: AbortSignal; timeoutMs?: number },
  ): Promise<T> {
    return this.request<T>("DELETE", path, options);
  }

  async getText(
    path: string,
    params?: Record<string, string | number>,
    options?: { signal?: AbortSignal; timeoutMs?: number },
  ): Promise<string> {
    const url = this.buildUrl(path, params);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "text/csv",
      "User-Agent": USER_AGENT,
    };
    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;

    return this.performRequest<string>(
      "GET",
      url,
      headers,
      undefined,
      timeoutMs,
      options?.signal,
      (response) => response.text(),
    );
  }

  put<T>(
    path: string,
    body?: unknown,
    options?: { signal?: AbortSignal; timeoutMs?: number },
  ): Promise<T> {
    return this.request<T>("PUT", path, { body, ...options });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
