import { inspect } from "node:util";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AwsysClient } from "../../src/index.js";
import { AwsysConfigurationError, AwsysAuthError } from "../../src/errors.js";
import type { AwsysClientConfig } from "../../src/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(resolve(__dirname, "../../package.json"), "utf-8"),
) as { version: string };

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
});

// Behaviors scoped to Milestone 1 (contracts/sdk-contract.json `behaviors[]`):
//   - auth_header
//   - unknown_fields_preserved
//
// Added this milestone (Milestone 2):
//   - redaction, user_agent, base_url_override, missing_api_key, iterator_links
//
// Still deferred — no Firestore-timestamp parsing helper exists yet, not in
// Milestone 2's scope (config/redaction/UA/listAll/deprecation):
//   - timestamp_variants

describe("Contract: behaviors — auth_header", () => {
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
});

describe("Contract: behaviors — user_agent", () => {
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
