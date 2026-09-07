import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import {
  AwsysClient,
  AwsysAuthError,
  AwsysConflictError,
  AwsysForbiddenError,
  AwsysNetworkError,
  AwsysNotFoundError,
  AwsysRateLimitError,
  AwsysServerError,
  AwsysTimeoutError,
  AwsysValidationError,
} from "../../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Overridable so CI's contract-drift workflow can run this same suite
// against a freshly-fetched platform contract without touching the
// vendored copy in the working tree.
const contractPath = process.env.AWSYS_CONTRACT_FIXTURE_PATH ?? resolve(__dirname, "sdk-contract.json");
const contract = JSON.parse(readFileSync(contractPath, "utf-8")) as {
  errors: Array<{
    id: string;
    status: number | null;
    body: unknown;
    expect_error: string;
    headers?: Record<string, string>;
    retry?: boolean;
    attempts?: number;
    method?: string;
  }>;
};

function scenario(id: string) {
  const found = contract.errors.find((e) => e.id === id);
  if (!found) throw new Error(`Missing contract error scenario: ${id}`);
  return found;
}

function jsonOrTextResponse(
  status: number,
  body: unknown,
  headers?: Record<string, string>,
): Response {
  if (typeof body === "string") {
    return new Response(body, { status, headers: { "content-type": "text/html", ...headers } });
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Contract: error mapping (no retry involved)", () => {
  const client = new AwsysClient({
    apiKey: "awsys_test_key",
    baseUrl: "https://awsys.co",
    maxRetries: 0,
  });

  it("err_401_invalid_key → AwsysAuthError", async () => {
    const s = scenario("err_401_invalid_key");
    fetchMock.mockResolvedValueOnce(jsonOrTextResponse(s.status!, s.body));
    await expect(client.links.get("abc123")).rejects.toMatchObject(
      new AwsysAuthError("Invalid or unauthorized API key.", "UNAUTHORIZED", s.body),
    );
  });

  it("err_401_missing_key → AwsysAuthError", async () => {
    const s = scenario("err_401_missing_key");
    fetchMock.mockResolvedValueOnce(jsonOrTextResponse(s.status!, s.body));
    const err = await client.links.get("abc123").catch((e) => e);
    expect(err).toBeInstanceOf(AwsysAuthError);
    expect(err.code).toBe("API_KEY_REQUIRED");
    expect(err.message).toBe("Valid API key required");
  });

  it("err_403_tier_string_error → AwsysForbiddenError, message from string error field", async () => {
    const s = scenario("err_403_tier_string_error");
    fetchMock.mockResolvedValueOnce(jsonOrTextResponse(s.status!, s.body));
    const err = await client.links.get("abc123").catch((e) => e);
    expect(err).toBeInstanceOf(AwsysForbiddenError);
    expect(err.message).toBe("AgentLink analytics require Pro or higher");
    expect(err.code).toBe("TIER_INSUFFICIENT");
  });

  it("err_403_email → AwsysForbiddenError", async () => {
    const s = scenario("err_403_email");
    fetchMock.mockResolvedValueOnce(jsonOrTextResponse(s.status!, s.body));
    const err = await client.links.get("abc123").catch((e) => e);
    expect(err).toBeInstanceOf(AwsysForbiddenError);
    expect(err.code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("err_403_feature_disabled → AwsysForbiddenError (recentClicks flag off)", async () => {
    const s = scenario("err_403_feature_disabled");
    fetchMock.mockResolvedValueOnce(jsonOrTextResponse(s.status!, s.body));
    const err = await client.analytics.getRecentClicks().catch((e) => e);
    expect(err).toBeInstanceOf(AwsysForbiddenError);
    expect(err.code).toBe("FEATURE_DISABLED");
  });

  it("err_400_missing_url → AwsysValidationError", async () => {
    const s = scenario("err_400_missing_url");
    fetchMock.mockResolvedValueOnce(jsonOrTextResponse(s.status!, s.body));
    const err = await client.links.create({ url: "" }).catch((e) => e);
    expect(err).toBeInstanceOf(AwsysValidationError);
    expect(err.code).toBe("MISSING_URL");
  });

  it("err_404_no_message → AwsysNotFoundError, message synthesized from code", async () => {
    const s = scenario("err_404_no_message");
    fetchMock.mockResolvedValueOnce(jsonOrTextResponse(s.status!, s.body));
    const err = await client.links.get("abc123").catch((e) => e);
    expect(err).toBeInstanceOf(AwsysNotFoundError);
    expect(err.code).toBe("IMPORT_JOB_NOT_FOUND");
    expect(err.message).toContain("IMPORT_JOB_NOT_FOUND");
  });

  it("err_404_no_code → AwsysNotFoundError, message from body", async () => {
    const s = scenario("err_404_no_code");
    fetchMock.mockResolvedValueOnce(jsonOrTextResponse(s.status!, s.body));
    const err = await client.links.get("abc123").catch((e) => e);
    expect(err).toBeInstanceOf(AwsysNotFoundError);
    expect(err.message).toBe("Link not found");
  });

  it("err_409 → AwsysConflictError", async () => {
    const s = scenario("err_409");
    fetchMock.mockResolvedValueOnce(jsonOrTextResponse(s.status!, s.body));
    const err = await client.links.get("abc123").catch((e) => e);
    expect(err).toBeInstanceOf(AwsysConflictError);
    expect(err.code).toBe("SLUG_TAKEN");
  });

  it("err_429_hourly → AwsysRateLimitError, quota-class not retried", async () => {
    const s = scenario("err_429_hourly");
    fetchMock.mockResolvedValueOnce(jsonOrTextResponse(s.status!, s.body));
    const err = await client.links.get("abc123").catch((e) => e);
    expect(err).toBeInstanceOf(AwsysRateLimitError);
    expect(err.code).toBe("HOURLY_LIMIT_EXCEEDED");
    expect(err.resetsAt).toBe((s.body as { resetsAt: string }).resetsAt);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("err_429_monthly → AwsysRateLimitError, quota-class not retried", async () => {
    const s = scenario("err_429_monthly");
    fetchMock.mockResolvedValueOnce(jsonOrTextResponse(s.status!, s.body));
    const err = await client.links.get("abc123").catch((e) => e);
    expect(err).toBeInstanceOf(AwsysRateLimitError);
    expect(err.code).toBe("MONTHLY_LIMIT_EXCEEDED");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("err_429_daily → AwsysRateLimitError, quota-class not retried", async () => {
    const s = scenario("err_429_daily");
    fetchMock.mockResolvedValueOnce(jsonOrTextResponse(s.status!, s.body));
    const err = await client.links.get("abc123").catch((e) => e);
    expect(err).toBeInstanceOf(AwsysRateLimitError);
    expect(err.code).toBe("DAILY_LIMIT_EXCEEDED");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("err_500 → AwsysServerError, never retried", async () => {
    const s = scenario("err_500");
    fetchMock.mockResolvedValueOnce(jsonOrTextResponse(s.status!, s.body));
    const err = await client.links.get("abc123").catch((e) => e);
    expect(err).toBeInstanceOf(AwsysServerError);
    expect(err.status).toBe(500);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("err_503_post_not_retried → AwsysServerError, POST never retried", async () => {
    const s = scenario("err_503_post_not_retried");
    fetchMock.mockResolvedValueOnce(jsonOrTextResponse(s.status!, s.body));
    const err = await client.links.create({ url: "https://example.com/" }).catch((e) => e);
    expect(err).toBeInstanceOf(AwsysServerError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("err_success_false_shape → AwsysRateLimitError from {success:false,...}", async () => {
    const s = scenario("err_success_false_shape");
    fetchMock.mockResolvedValueOnce(jsonOrTextResponse(s.status!, s.body));
    const err = await client.links.get("abc123").catch((e) => e);
    expect(err).toBeInstanceOf(AwsysRateLimitError);
    expect(err.code).toBe("RATE_LIMITED");
    expect(err.message).toBe("Too many attempts");
  });

  it("err_non_json → AwsysServerError, message falls back to status text", async () => {
    const s = scenario("err_non_json");
    fetchMock.mockResolvedValueOnce(jsonOrTextResponse(s.status!, s.body));
    const err = await client.links.create({ url: "https://example.com/" }).catch((e) => e);
    expect(err).toBeInstanceOf(AwsysServerError);
    expect(err.status).toBe(502);
    // Non-JSON body never throws a parse error up to the caller — message
    // falls back to the HTTP status text rather than the raw HTML.
    expect(err.message).not.toContain("<html>");
  });

  it("err_network → AwsysNetworkError on POST (non-idempotent, no retry)", async () => {
    scenario("err_network");
    fetchMock.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));
    const err = await client.links.create({ url: "https://example.com/" }).catch((e) => e);
    expect(err).toBeInstanceOf(AwsysNetworkError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("Contract: retry-sensitive error scenarios (fake timers, no real sleeps)", () => {
  it("err_429_retry_after → retries after the header delay and succeeds silently", async () => {
    const s = scenario("err_429_retry_after");
    vi.useFakeTimers();
    const client = new AwsysClient({ apiKey: "awsys_test_key", baseUrl: "https://awsys.co" });

    fetchMock
      .mockResolvedValueOnce(
        jsonOrTextResponse(s.status!, s.body, s.headers),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "abc123", short: "abc123" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

    const promise = client.links.get("abc123");
    await vi.advanceTimersByTimeAsync(10_000);
    const result = await promise;

    expect(result).toMatchObject({ id: "abc123" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("err_429_exhausted → 4 attempts then AwsysRateLimitError", async () => {
    const s = scenario("err_429_exhausted");
    vi.useFakeTimers();
    const client = new AwsysClient({ apiKey: "awsys_test_key", baseUrl: "https://awsys.co" });

    fetchMock.mockResolvedValue(jsonOrTextResponse(s.status!, s.body));

    const promise = client.links.get("abc123").catch((e) => e);
    await vi.advanceTimersByTimeAsync(150_000);
    const err = await promise;

    expect(err).toBeInstanceOf(AwsysRateLimitError);
    expect(fetchMock).toHaveBeenCalledTimes(s.attempts ?? 4);
  });

  it("err_503_get_retried → GET retries once and succeeds", async () => {
    const s = scenario("err_503_get_retried");
    vi.useFakeTimers();
    const client = new AwsysClient({ apiKey: "awsys_test_key", baseUrl: "https://awsys.co" });

    fetchMock
      .mockResolvedValueOnce(jsonOrTextResponse(s.status!, s.body))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "abc123" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

    const promise = client.links.get("abc123");
    await vi.advanceTimersByTimeAsync(35_000);
    const result = await promise;

    expect(result).toMatchObject({ id: "abc123" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("err_timeout → AwsysTimeoutError (subclass of AwsysNetworkError), never retried", async () => {
    scenario("err_timeout");
    vi.useFakeTimers();
    const client = new AwsysClient({
      apiKey: "awsys_test_key",
      baseUrl: "https://awsys.co",
      timeoutMs: 50,
    });

    fetchMock.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            const err = new Error("The operation was aborted");
            err.name = "AbortError";
            reject(err);
          });
        }),
    );

    const promise = client.links.get("abc123").catch((e) => e);
    await vi.advanceTimersByTimeAsync(1000);
    const err = await promise;

    expect(err).toBeInstanceOf(AwsysTimeoutError);
    expect(err).toBeInstanceOf(AwsysNetworkError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
