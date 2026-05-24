import {
  AwsysAuthError,
  AwsysConflictError,
  AwsysError,
  AwsysForbiddenError,
  AwsysNotFoundError,
  AwsysRateLimitError,
  AwsysValidationError,
} from "./errors.js";

interface ErrorBody {
  // The AWSYS API uses `error: true` (boolean) as a flag, not a string
  error?: boolean | string;
  code?: string;
  message?: string;
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = parseInt(value, 10);
  return isNaN(seconds) ? undefined : seconds;
}

async function parseErrorBody(response: Response): Promise<ErrorBody> {
  try {
    return (await response.json()) as ErrorBody;
  } catch {
    return {};
  }
}

function throwForStatus(
  status: number,
  body: ErrorBody,
  raw: unknown,
  retryAfterHeader: string | null,
): never {
  // body.error is a boolean flag in the AWSYS API; use body.message for the message
  const message =
    (typeof body.error === "string" ? body.error : undefined) ??
    body.message ??
    `HTTP ${status} error`;
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
        parseRetryAfter(retryAfterHeader),
      );
    default:
      throw new AwsysError(message, status, code, raw);
  }
}

const DEFAULT_MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export class HttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly maxRetries: number;

  constructor(apiKey: string, baseUrl: string, maxRetries?: number) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.maxRetries = maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
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

  async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      params?: Record<string, string | number>;
    },
  ): Promise<T> {
    const url = this.buildUrl(path, options?.params);
    const headers = this.buildHeaders();

    let attempt = 0;

    while (true) {
      const response = await fetch(url, {
        method,
        headers,
        body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
      });

      if (response.ok) {
        // 204 No Content
        if (response.status === 204) {
          return undefined as unknown as T;
        }
        return (await response.json()) as T;
      }

      const body = await parseErrorBody(response);
      const retryAfterHeader = response.headers.get("Retry-After");

      // Retry on 429 with exponential backoff
      if (response.status === 429 && attempt < this.maxRetries) {
        const delay =
          parseRetryAfter(retryAfterHeader) != null
            ? (parseRetryAfter(retryAfterHeader) as number) * 1000
            : BASE_DELAY_MS * Math.pow(2, attempt);

        await sleep(delay);
        attempt++;
        continue;
      }

      throwForStatus(response.status, body, body, retryAfterHeader);
    }
  }

  get<T>(
    path: string,
    params?: Record<string, string | number>,
  ): Promise<T> {
    return this.request<T>("GET", path, { params });
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, { body });
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PATCH", path, { body });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
