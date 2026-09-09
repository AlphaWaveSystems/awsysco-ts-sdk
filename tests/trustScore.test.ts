import { describe, it, expect, vi, beforeEach } from "vitest";
import { TrustScoreResource } from "../src/resources/trustScore.js";
import type { HttpClient } from "../src/http.js";

function mockHttp(overrides: Partial<HttpClient> = {}): HttpClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
    getText: vi.fn(),
    request: vi.fn(),
    ...overrides,
  } as unknown as HttpClient;
}

describe("TrustScoreResource", () => {
  let http: HttpClient;
  let trustScore: TrustScoreResource;

  beforeEach(() => {
    http = mockHttp();
    trustScore = new TrustScoreResource(http);
  });

  describe("scan", () => {
    it("calls GET /api/link-scan/:short and returns the result, mapping legacy shortCode/score/status aliases from the real wire fields", async () => {
      // Raw wire response — `short`/trustScore/trustStatus/threats are the
      // real platform fields (verified live against staging, contract
      // fixture 1.0.11); shortCode/score/status are legacy aliases the SDK
      // derives, not sent by the platform (a prior fix had this backwards
      // — ADR-022).
      const raw = {
        short: "abc123",
        trustScore: 95,
        trustStatus: "safe",
        threats: [],
        scannedAt: "2026-06-01T12:00:00Z",
        source: "gsb+heuristics",
        createdAt: 1780000000000,
      };
      vi.mocked(http.get).mockResolvedValue(raw);

      const result = await trustScore.scan("abc123");

      expect(http.get).toHaveBeenCalledWith("/api/link-scan/abc123", undefined, undefined);
      expect(result).toEqual({
        ...raw,
        shortCode: "abc123",
        score: 95,
        status: "safe",
        createdAt: new Date(raw.createdAt).toISOString(),
      });
    });

    it("handles an unrecognized trustStatus value with null score", async () => {
      vi.mocked(http.get).mockResolvedValue({
        short: "abc123",
        trustScore: null,
        trustStatus: "unknown",
        threats: [],
        scannedAt: null,
      });

      const result = await trustScore.scan("abc123");
      expect(result.score).toBeNull();
      expect(result.status).toBe("unknown");
      expect(result.trustScore).toBeNull();
      expect(result.trustStatus).toBe("unknown");
    });

    it("URL-encodes namespaced short paths", async () => {
      vi.mocked(http.get).mockResolvedValue({
        short: "ns/slug",
        trustScore: 80,
        trustStatus: "safe",
        threats: [],
        scannedAt: null,
      });

      await trustScore.scan("ns/slug");

      expect(http.get).toHaveBeenCalledWith("/api/link-scan/ns%2Fslug", undefined, undefined);
    });
  });
});
