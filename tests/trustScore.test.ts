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
    it("calls GET /api/link-scan/:short and returns the result", async () => {
      const expected = {
        short: "abc123",
        long: "https://example.com",
        score: 95,
        status: "safe" as const,
        threats: [],
        scannedAt: "2026-06-01T12:00:00Z",
      };
      vi.mocked(http.get).mockResolvedValue(expected);

      const result = await trustScore.scan("abc123");

      expect(http.get).toHaveBeenCalledWith("/api/link-scan/abc123");
      expect(result).toEqual(expected);
    });

    it("handles unknown status with null score", async () => {
      const expected = {
        short: "abc123",
        long: "https://example.com",
        score: null,
        status: "unknown" as const,
        scannedAt: null,
      };
      vi.mocked(http.get).mockResolvedValue(expected);

      const result = await trustScore.scan("abc123");
      expect(result.score).toBeNull();
      expect(result.status).toBe("unknown");
    });

    it("URL-encodes namespaced short paths", async () => {
      vi.mocked(http.get).mockResolvedValue({
        short: "ns/slug",
        long: "https://example.com",
        score: 80,
        status: "safe" as const,
        scannedAt: null,
      });

      await trustScore.scan("ns/slug");

      expect(http.get).toHaveBeenCalledWith("/api/link-scan/ns%2Fslug");
    });
  });
});
