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
    it("calls GET /api/link-scan/:short and returns the result, mapping legacy short/score/status aliases from the wire fields", async () => {
      // Raw wire response — shortCode/trustScore/trustStatus/threats are
      // the real platform fields (links.js:566-568); short/score/status are
      // legacy aliases the SDK derives, not sent by the platform.
      const raw = {
        shortCode: "abc123",
        trustScore: 95,
        trustStatus: "safe" as const,
        threats: [],
        scannedAt: "2026-06-01T12:00:00Z",
      };
      vi.mocked(http.get).mockResolvedValue(raw);

      const result = await trustScore.scan("abc123");

      expect(http.get).toHaveBeenCalledWith("/api/link-scan/abc123");
      expect(result).toEqual({
        ...raw,
        short: "abc123",
        score: 95,
        status: "safe",
      });
    });

    it("handles unknown status with null score", async () => {
      vi.mocked(http.get).mockResolvedValue({
        shortCode: "abc123",
        trustScore: null,
        trustStatus: "unknown" as const,
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
        shortCode: "ns/slug",
        trustScore: 80,
        trustStatus: "safe" as const,
        threats: [],
        scannedAt: null,
      });

      await trustScore.scan("ns/slug");

      expect(http.get).toHaveBeenCalledWith("/api/link-scan/ns%2Fslug");
    });
  });
});
