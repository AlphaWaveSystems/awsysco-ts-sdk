import { describe, it, expect, vi, beforeEach } from "vitest";
import { UsageResource } from "../src/resources/usage.js";
import type { HttpClient } from "../src/http.js";
import type { UsageStats } from "../src/types.js";

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

describe("UsageResource", () => {
  let http: HttpClient;
  let usage: UsageResource;

  beforeEach(() => {
    http = mockHttp();
    usage = new UsageResource(http);
  });

  describe("get", () => {
    it("calls GET /api/user/stats and returns the parsed stats", async () => {
      // The raw wire response — `linksCreatedThisMonth` is NOT a real
      // platform field (see `linksCreatedThisMonth`'s @deprecated tsdoc in
      // types.ts); the SDK derives it from `linksCreatedToday` below. The
      // other legacy fields genuinely never appear on the wire, but pass
      // through unchanged if present (proving the type stays open to them).
      const raw = {
        totalLinks: 42,
        totalClicks: 1234,
        qrCodesThisMonth: 2,
        folderCount: 3,
        apiCallsThisMonth: 100,
        trackedClicksThisMonth: 900,
        tier: "pro",
        limits: {
          linksPerMonth: "unlimited",
          monthlyLinks: "unlimited",
          dailyLinks: 1000,
          monthlyTrackedClicks: "unlimited",
          apiCallsPerMonth: 10000,
          qrCodes: "unlimited",
          folders: 50,
          customSlugs: 100,
        },
        hasApiKey: true,
        apiKeyCreatedAt: "2026-01-01T00:00:00Z",
        userPrefix: "acme",
        isPremium: true,
        overage: {
          active: false,
          startedAt: null,
          expiresAt: null,
          hoursUntilDrop: null,
          clicksThisCycle: 900,
          spendingLimitCents: 5000,
          estimatedChargeCents: 0,
        },
        linksCreatedToday: 5,
        linksToday: 5,
      };
      const expected: UsageStats = { ...raw, linksCreatedThisMonth: 5 };
      vi.mocked(http.get).mockResolvedValue(raw);

      const result = await usage.get();

      expect(http.get).toHaveBeenCalledWith("/api/user/stats");
      expect(result).toEqual(expected);
    });

    it("handles 'unlimited' and numeric limit values", async () => {
      vi.mocked(http.get).mockResolvedValue({
        tier: "free",
        limits: {
          linksPerMonth: 100,
          monthlyLinks: 100,
          dailyLinks: 25,
          monthlyTrackedClicks: 1000,
          apiCallsPerMonth: 0,
          qrCodes: 10,
          folders: 3,
          customSlugs: 0,
        },
      });

      const result = await usage.get();
      expect(result.limits.linksPerMonth).toBe(100);
      expect(result.limits.apiCallsPerMonth).toBe(0);
    });
  });
});
