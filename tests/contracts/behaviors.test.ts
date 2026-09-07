import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AwsysClient } from "../../src/index.js";

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
// Deferred to Milestone 2, once their underlying mechanism lands:
//   - redaction        → needs toJSON/util.inspect.custom (task 7)
//   - user_agent        → needs tsup version injection (task 7)
//   - base_url_override → needs client config validation (task 7)
//   - missing_api_key   → needs client config validation (task 7)
//   - timestamp_variants → needs a Firestore-timestamp parsing helper (not yet scheduled)
//   - iterator_links    → needs links.listAll() (task 8)

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
