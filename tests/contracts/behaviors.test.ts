import { inspect } from "node:util";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AwsysClient } from "../../src/index.js";
import { AwsysConfigurationError, AwsysAuthError, AwsysTimeoutError } from "../../src/errors.js";
import { parseTimestamp } from "../../src/timestamps.js";
import type { AwsysClientConfig } from "../../src/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(resolve(__dirname, "../../package.json"), "utf-8"),
) as { version: string };

// Overridable so CI's contract-drift workflow can run this same suite
// against a freshly-fetched platform contract without touching the
// vendored copy in the working tree (same convention as capabilities.test.ts
// and errors.test.ts).
const contractPath =
  process.env.AWSYS_CONTRACT_FIXTURE_PATH ?? resolve(__dirname, "sdk-contract.json");
const contract = JSON.parse(readFileSync(contractPath, "utf-8")) as {
  behaviors: Array<{ id: string }>;
};

/**
 * Marks a behavior scenario ID as covered by this file. A no-op at runtime
 * (returns void) — its only purpose is to appear, as a string literal, in
 * this file's own source, so the static text scan below can find it. Same
 * convention as `coveredIds`/`coveredErrorIds` in capabilities.test.ts and
 * errors.test.ts: static text analysis is collection-time, not
 * execution-time, so it stays correct under `--shard`/`.only`.
 */
function markCovered(_id: string): void {
  // Intentionally empty.
}

const coveredBehaviorIds = new Set(
  [...readFileSync(fileURLToPath(import.meta.url), "utf-8").matchAll(
    /markCovered\(\s*"([^"]+)"/g,
  )].map((m) => m[1]),
);

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
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

// Behaviors scoped to Milestone 1 (contracts/sdk-contract.json `behaviors[]`):
//   - auth_header
//   - unknown_fields_preserved
//
// Added Milestone 2:
//   - redaction, user_agent, base_url_override, missing_api_key, iterator_links
//
// Added Milestone 3:
//   - timestamp_variants (src/timestamps.ts's parseTimestamp(); see ADR-017:
//     returns an ISO string, not a Date, for the 1.x line.)
//
// Added post-milestone-3 (PR #10 review fixes, fixture 1.0.5):
//   - body_read_within_timeout, config_warnings, release_tag_matches_version
//
// Added post-merge (fixture 1.0.7, Python-review follow-ups):
//   - iterator_links_limit_zero, links_list_has_more_from_pagination,
//     redaction_str (extends redaction: String()/template-literal coercion
//     of client/errors, plus HttpClient's own redaction), timestamp_never_raises
//     (extends timestamp_variants with the 4 specific malformed inputs)

describe("Contract: behaviors — auth_header", () => {
  markCovered("auth_header");
  it("sends Authorization: Bearer <key> on every authenticated request", async () => {
    const client = new AwsysClient({ apiKey: "awsys_test_key", baseUrl: "https://awsys.co" });
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: "abc123" }));

    await client.links.get("abc123");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer awsys_test_key");
  });
});

describe("Contract: behaviors — unknown_fields_preserved", () => {
  markCovered("unknown_fields_preserved");
  it("does not raise on extra JSON fields, and they remain accessible", async () => {
    const client = new AwsysClient({ apiKey: "awsys_test_key", baseUrl: "https://awsys.co" });
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        id: "abc123",
        short: "abc123",
        long: "https://example.com/",
        // Fields not declared on the SDK's `Link` type:
        futurePlatformField: "surprise",
        nested: { alsoUnknown: true },
      }),
    );

    const result = await client.links.get("abc123");

    expect((result as unknown as Record<string, unknown>).futurePlatformField).toBe(
      "surprise",
    );
    expect(
      (result as unknown as { nested: { alsoUnknown: boolean } }).nested.alsoUnknown,
    ).toBe(true);
  });
});

describe("Contract: behaviors — redaction", () => {
  markCovered("redaction");
  markCovered("redaction_str"); // String()/template-literal coercion + HttpClient's own redaction, tested below.
  const RAW_KEY = "awsys_super_secret_key_do_not_leak";

  it("JSON.stringify(client) never contains the raw API key", () => {
    const client = new AwsysClient({ apiKey: RAW_KEY, baseUrl: "https://awsys.co" });
    expect(JSON.stringify(client)).not.toContain(RAW_KEY);
  });

  it("util.inspect(client) never contains the raw API key", () => {
    const client = new AwsysClient({ apiKey: RAW_KEY, baseUrl: "https://awsys.co" });
    expect(inspect(client)).not.toContain(RAW_KEY);
  });

  it("a thrown error never contains the raw API key or an echoed accessToken", async () => {
    const client = new AwsysClient({ apiKey: RAW_KEY, baseUrl: "https://awsys.co" });
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, {
        error: true,
        code: "UNAUTHORIZED",
        message: "invalid key",
        // Simulates a body that echoes back sensitive request fields —
        // must never surface through the error's own serialization.
        accessToken: "bitly_super_secret_token",
      }),
    );

    let caught: unknown;
    try {
      await client.links.get("abc123");
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(AwsysAuthError);
    expect(JSON.stringify(caught)).not.toContain(RAW_KEY);
    expect(JSON.stringify(caught)).not.toContain("bitly_super_secret_token");
    expect(inspect(caught)).not.toContain(RAW_KEY);
    expect(inspect(caught)).not.toContain("bitly_super_secret_token");
  });

  it("String(client)/`${client}` coercion never contains the raw API key", () => {
    const client = new AwsysClient({ apiKey: RAW_KEY, baseUrl: "https://awsys.co" });
    // AwsysClient stores only a pre-redacted key (`redactedApiKey`) on
    // itself and never overrides toString(), so default coercion falls
    // through to Object.prototype.toString() ("[object Object]") — safe
    // either way, but assert it explicitly rather than relying on that.
    // eslint-disable-next-line @typescript-eslint/no-base-to-string -- asserting the safe default-stringification behavior is the point of this test
    expect(String(client)).not.toContain(RAW_KEY);
    // eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/restrict-template-expressions -- same as above, for template-literal coercion
    expect(`${client}`).not.toContain(RAW_KEY);
  });

  it("String(err)/`${err}` coercion never contains the raw API key", async () => {
    const client = new AwsysClient({ apiKey: RAW_KEY, baseUrl: "https://awsys.co" });
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { error: true, code: "UNAUTHORIZED", message: "invalid key" }),
    );
    const err = await client.links.get("abc123").catch((e) => e);
    // Error.prototype.toString() (name + message) is used — never
    // overridden to include `raw`/the key.
    expect(String(err)).not.toContain(RAW_KEY);
    expect(`${err}`).not.toContain(RAW_KEY);
  });

  it("every resource's underlying HttpClient also redacts (not just the top-level client)", () => {
    // Every resource (client.links, client.webhooks, ...) holds its own
    // reference to the shared HttpClient. TS `private` is erased at
    // runtime, so without HttpClient's own toJSON/[inspect.custom],
    // `util.inspect(client.links)` would print the raw key in plaintext.
    const client = new AwsysClient({ apiKey: RAW_KEY, baseUrl: "https://awsys.co" });
    expect(JSON.stringify(client.links)).not.toContain(RAW_KEY);
    expect(inspect(client.links)).not.toContain(RAW_KEY);
    expect(inspect(client.webhooks)).not.toContain(RAW_KEY);
  });

  // Note on the fixture's "models carrying secrets (Webhook.secret)" clause:
  // in TS, `Webhook` is a plain response-data interface, not a class the
  // SDK constructs — there's no coercion hook to attach redaction to, and
  // stripping `secret` from data the user's own API key legitimately
  // fetched would break its only purpose (configuring their receiver). We
  // instead guarantee the SDK's OWN code never logs a webhook: confirmed by
  // grepping `src/` for `console.*` — the only call sites are the two
  // config warnings above and the customDomains.activate deprecation
  // warning, none of which touch webhook data.
});

describe("Contract: behaviors — user_agent", () => {
  markCovered("user_agent");
  it("matches ^awsysco-ts-sdk/x.y.z (node/…) and the version equals package.json", async () => {
    const client = new AwsysClient({ apiKey: "awsys_test_key", baseUrl: "https://awsys.co" });
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: "abc123" }));

    await client.links.get("abc123");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["User-Agent"]).toMatch(/^awsysco-ts-sdk\/\d+\.\d+\.\d+ \(node\/.+\)$/);
    expect(headers["User-Agent"]).toContain(`awsysco-ts-sdk/${pkg.version} `);
  });
});

describe("Contract: behaviors — base_url_override", () => {
  markCovered("base_url_override");
  it("a valid override with a trailing slash routes requests correctly, slash stripped", async () => {
    const client = new AwsysClient({
      apiKey: "awsys_test_key",
      baseUrl: "https://staging.awsys.co/",
    });
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: "abc123" }));

    await client.links.get("abc123");

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://staging.awsys.co/api/v1/links/abc123");
  });

  it("rejects a non-http(s) scheme (ftp://x) with AwsysConfigurationError", () => {
    expect(
      () => new AwsysClient({ apiKey: "awsys_test_key", baseUrl: "ftp://x" }),
    ).toThrow(AwsysConfigurationError);
  });

  it("rejects a bare host with no scheme (awsys.co) with AwsysConfigurationError", () => {
    expect(
      () => new AwsysClient({ apiKey: "awsys_test_key", baseUrl: "awsys.co" }),
    ).toThrow(AwsysConfigurationError);
  });
});

describe("Contract: behaviors — missing_api_key", () => {
  markCovered("missing_api_key");
  const originalEnv = process.env.AWSYS_API_KEY;

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.AWSYS_API_KEY;
    else process.env.AWSYS_API_KEY = originalEnv;
  });

  it("no key and no AWSYS_API_KEY throws AwsysConfigurationError before any request", () => {
    delete process.env.AWSYS_API_KEY;
    expect(() => new AwsysClient({} as AwsysClientConfig)).toThrow(AwsysConfigurationError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to AWSYS_API_KEY when apiKey is omitted", async () => {
    process.env.AWSYS_API_KEY = "awsys_from_env";
    const client = new AwsysClient({} as AwsysClientConfig);
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: "abc123" }));

    await client.links.get("abc123");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer awsys_from_env");
  });
});

describe("Contract: behaviors — iterator_links", () => {
  markCovered("iterator_links");
  it("list_all over scenarios list_links → list_links_last_page yields 3 links with 2 requests", async () => {
    const client = new AwsysClient({ apiKey: "awsys_test_key", baseUrl: "https://awsys.co" });
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, {
          links: [
            { id: "abc123", shortCode: "abc123" },
            { id: "def456", shortCode: "def456" },
          ],
          pagination: { limit: 2, offset: 0, hasMore: true },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          links: [{ id: "ghi789", shortCode: "ghi789" }],
          pagination: { limit: 2, offset: 2, hasMore: false },
        }),
      );

    const collected: unknown[] = [];
    for await (const link of client.links.listAll({ limit: 2 })) {
      collected.push(link);
    }

    expect(collected).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("Contract: behaviors — iterator_links_limit_zero", () => {
  markCovered("iterator_links_limit_zero");
  it("limit: 0 clamps to 1 and terminates instead of looping forever", async () => {
    const client = new AwsysClient({ apiKey: "awsys_test_key", baseUrl: "https://awsys.co" });
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        links: [{ id: "abc123", shortCode: "abc123" }],
        pagination: { limit: 1, offset: 0, hasMore: false },
      }),
    );

    const collected: unknown[] = [];
    for await (const link of client.links.listAll({ limit: 0 })) {
      collected.push(link);
    }

    expect(collected).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestedUrl = new URL(fetchMock.mock.calls[0][0]);
    expect(requestedUrl.searchParams.get("limit")).toBe("1");
  });

  it("a negative limit clamps to 1 and terminates instead of looping forever", async () => {
    const client = new AwsysClient({ apiKey: "awsys_test_key", baseUrl: "https://awsys.co" });
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        links: [],
        pagination: { limit: 1, offset: 0, hasMore: false },
      }),
    );

    const collected: unknown[] = [];
    for await (const link of client.links.listAll({ limit: -5 })) {
      collected.push(link);
    }

    expect(collected).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("Contract: behaviors — links_list_has_more_from_pagination", () => {
  markCovered("links_list_has_more_from_pagination");
  it("list()'s hasMore is read from pagination.hasMore, not a top-level key", async () => {
    const client = new AwsysClient({ apiKey: "awsys_test_key", baseUrl: "https://awsys.co" });

    fetchMock.mockResolvedValueOnce(
      // A top-level `hasMore: false` that contradicts the real signal in
      // `pagination.hasMore` — if the SDK ever regresses to reading a
      // top-level key, this would flip the assertion below.
      jsonResponse(200, {
        links: [{ id: "abc123", shortCode: "abc123" }],
        hasMore: false,
        pagination: { limit: 20, offset: 0, hasMore: true },
      }),
    );
    const page1 = await client.links.list();
    expect(page1.hasMore).toBe(true);

    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        links: [],
        hasMore: true,
        pagination: { limit: 20, offset: 20, hasMore: false },
      }),
    );
    const page2 = await client.links.list({ offset: 20 });
    expect(page2.hasMore).toBe(false);
  });
});

describe("Contract: behaviors — timestamp_variants", () => {
  markCovered("timestamp_variants");
  markCovered("timestamp_never_raises");
  it("passes through a plain ISO string unchanged", () => {
    expect(parseTimestamp("2026-09-01T00:00:00.000Z")).toBe("2026-09-01T00:00:00.000Z");
  });

  it("parses a Firestore {_seconds,_nanoseconds} shape to an ISO string", () => {
    const result = parseTimestamp({ _seconds: 1756684800, _nanoseconds: 0 });
    expect(result).toBe(new Date(1756684800 * 1000).toISOString());
  });

  it("parses a {seconds,nanoseconds} shape (no underscore) to an ISO string", () => {
    const result = parseTimestamp({ seconds: 1756684800, nanoseconds: 500_000_000 });
    expect(result).toBe(new Date(1756684800 * 1000 + 500).toISOString());
  });

  it("keeps an unrecognized shape as-is rather than throwing", () => {
    const garbage = { totally: "unrelated" };
    expect(parseTimestamp(garbage)).toBe(garbage);
    expect(parseTimestamp(null)).toBe(null);
    expect(parseTimestamp(undefined)).toBe(undefined);
    expect(parseTimestamp(42)).toBe(42);
  });

  it("timestamp_never_raises: never throws for malformed/out-of-range shapes", () => {
    // Non-numeric nanoseconds — fails the typeof check, falls through raw.
    const nonNumericNanos = { seconds: 1, nanoseconds: "q" };
    expect(() => parseTimestamp(nonNumericNanos)).not.toThrow();
    expect(parseTimestamp(nonNumericNanos)).toBe(nonNumericNanos);

    // Absurdly large seconds — produces a ms value outside Date's valid
    // range; new Date(...).toISOString() would throw RangeError without
    // the finite/valid-date guard.
    const hugeSeconds = { _seconds: 1e300 };
    expect(() => parseTimestamp(hugeSeconds)).not.toThrow();
    expect(parseTimestamp(hugeSeconds)).toBe(hugeSeconds);

    // Absurdly negative seconds — same out-of-range failure mode.
    const hugeNegativeSeconds = { seconds: -1e14 };
    expect(() => parseTimestamp(hugeNegativeSeconds)).not.toThrow();
    expect(parseTimestamp(hugeNegativeSeconds)).toBe(hugeNegativeSeconds);

    // Array instead of a number — fails the typeof check, falls through raw.
    const arraySeconds = { seconds: [1] };
    expect(() => parseTimestamp(arraySeconds)).not.toThrow();
    expect(parseTimestamp(arraySeconds)).toBe(arraySeconds);
  });
});

describe("Contract: behaviors — timestamp_variants (wired into response parsing)", () => {
  it("normalizes a Firestore-shaped `created` field on a real Link response to an ISO string", async () => {
    const client = new AwsysClient({ apiKey: "awsys_test_key", baseUrl: "https://awsys.co" });
    const firestoreCreated = { _seconds: 1756684800, _nanoseconds: 0 };

    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        id: "doc123",
        short: "abc123",
        shortCode: "abc123",
        fullPath: "abc123",
        long: "https://example.com/",
        clicks: 0,
        created: firestoreCreated,
        expiresAt: null,
        maxClicks: null,
        isCustom: false,
      }),
    );

    const link = await client.links.get("abc123");

    expect(link.created).toBe(new Date(1756684800 * 1000).toISOString());
    expect(typeof link.created).toBe("string");
  });

  it("normalizes Firestore-shaped timestamps on links.list() results too", async () => {
    const client = new AwsysClient({ apiKey: "awsys_test_key", baseUrl: "https://awsys.co" });
    const firestoreExpiresAt = { seconds: 1756684800, nanoseconds: 0 };

    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        links: [
          {
            id: "doc123",
            short: "abc123",
            shortCode: "abc123",
            fullPath: "abc123",
            long: "https://example.com/",
            clicks: 0,
            created: null,
            expiresAt: firestoreExpiresAt,
            maxClicks: null,
            isCustom: false,
          },
        ],
        pagination: { limit: 20, offset: 0, hasMore: false },
      }),
    );

    const page = await client.links.list();

    expect(page.data[0]?.expiresAt).toBe(new Date(1756684800 * 1000).toISOString());
  });
});

describe("Contract: behaviors — body_read_within_timeout", () => {
  markCovered("body_read_within_timeout");
  it("a body read that stalls past the timeout raises AwsysTimeoutError (timer covers the whole attempt, not just headers)", async () => {
    vi.useFakeTimers();
    const client = new AwsysClient({
      apiKey: "awsys_test_key",
      baseUrl: "https://awsys.co",
      timeoutMs: 50,
    });

    // Headers arrive immediately (fetch() resolves), but .json() never
    // settles on its own — only when the SAME AbortSignal used for the
    // fetch call fires, exactly as a real stalled body read would behave.
    // If the timeout timer were cleared right after fetch() resolves (the
    // bug this test guards against), this would hang forever instead of
    // rejecting.
    fetchMock.mockImplementationOnce((_url: string, init: RequestInit) => {
      const response = new Response(null, { status: 200 });
      response.json = () =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            const err = new Error("The operation was aborted");
            err.name = "AbortError";
            reject(err);
          });
        });
      return Promise.resolve(response);
    });

    const promise = client.links.get("abc123").catch((e) => e);
    await vi.advanceTimersByTimeAsync(1000);
    const err = await promise;

    expect(err).toBeInstanceOf(AwsysTimeoutError);
  });
});

describe("Contract: behaviors — config_warnings", () => {
  markCovered("config_warnings");
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("an API key not starting with awsys_ emits one warning-level log line", () => {
    new AwsysClient({ apiKey: "not-an-awsys-key", baseUrl: "https://awsys.co" });
    const keyWarnings = warnSpy.mock.calls.filter(([msg]) =>
      String(msg).includes("does not look like an AWSYS API key"),
    );
    expect(keyWarnings).toHaveLength(1);
  });

  it("a non-https baseUrl emits one warning-level log line", () => {
    new AwsysClient({ apiKey: "awsys_test_key", baseUrl: "http://example.com" });
    const urlWarnings = warnSpy.mock.calls.filter(([msg]) => String(msg).includes("http://"));
    expect(urlWarnings).toHaveLength(1);
  });
});

describe("Contract: behaviors — release_tag_matches_version", () => {
  markCovered("release_tag_matches_version");
  it("publish.yml asserts the git tag equals v<package.json version> before publishing", () => {
    const workflow = readFileSync(
      resolve(__dirname, "../../.github/workflows/publish.yml"),
      "utf-8",
    );
    expect(workflow).toContain("require('./package.json').version");
    expect(workflow).toContain("$GITHUB_REF_NAME");
    // The version-check step must run before the publish step, not after.
    const versionCheckIndex = workflow.indexOf("Verify tag matches package.json version");
    const publishIndex = workflow.indexOf("npm publish");
    expect(versionCheckIndex).toBeGreaterThan(-1);
    expect(versionCheckIndex).toBeLessThan(publishIndex);
  });
});

describe("Contract: behavior coverage", () => {
  it("every behavior scenario is exercised by a test in this file (Gate 3)", () => {
    const missing = contract.behaviors
      .map((b) => b.id)
      .filter((id) => !coveredBehaviorIds.has(id));

    if (missing.length > 0) {
      throw new Error(
        `${missing.length}/${contract.behaviors.length} behavior scenario(s) not yet mapped to a test:\n` +
          missing.map((id) => `  - ${id}`).join("\n"),
      );
    }
  });
});
