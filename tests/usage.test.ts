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
    it("calls GET /api/user/stats and returns every field mapped 1:1 from the wire", async () => {
      // Verified live against staging (contract fixture 1.0.6, "usage"
      // scenario) — every field here is a real, always-present response
      // field, mapped straight through with no renaming.
      const raw: UsageStats = {
        totalLinks: 42,
        totalClicks: 1234,
        linksCreatedThisMonth: 7,
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
      };
      vi.mocked(http.get).mockResolvedValue(raw);

      const result = await usage.get();

      expect(http.get).toHaveBeenCalledWith("/api/user/stats", undefined, undefined);
      expect(result).toEqual(raw);
      // linksCreatedThisMonth maps directly from the wire's own field of
      // the same name — NOT from a "linksCreatedToday" field (that was a
      // prior, incorrect understanding of this endpoint's shape).
      expect(result.linksCreatedThisMonth).toBe(7);
    });

    it("handles 'unlimited' and numeric/boolean limit values", async () => {
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
          customSlugs: false,
        },
      });

      const result = await usage.get();
      expect(result.limits.linksPerMonth).toBe(100);
      expect(result.limits.apiCallsPerMonth).toBe(0);
      expect(result.limits.customSlugs).toBe(false);
    });

    it("forwards a per-call signal/timeoutMs override", async () => {
      vi.mocked(http.get).mockResolvedValue({});
      const controller = new AbortController();

      await usage.get({ signal: controller.signal, timeoutMs: 5000 });

      expect(http.get).toHaveBeenCalledWith("/api/user/stats", undefined, {
        signal: controller.signal,
        timeoutMs: 5000,
      });
    });
  });
});
