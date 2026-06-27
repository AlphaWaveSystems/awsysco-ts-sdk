import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { AwsysClient } from "../src/index.js";
import { AnalyticsResource } from "../src/resources/analytics.js";
import type { HttpClient } from "../src/http.js";
import type { AggregateStats } from "../src/types.js";

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

const client = new AwsysClient({
  apiKey: process.env.AWSYS_API_KEY!,
  baseUrl: process.env.AWSYS_BASE_URL ?? "https://staging.awsys.co",
});

describe("Analytics", () => {
  let shortCode: string;
  let setupSkip = false;

  beforeAll(async () => {
    try {
      const result = await client.links.create({
        url: `https://example.com/sdk-analytics-test-${Date.now()}`,
      });
      shortCode = result.shortCode;
    } catch (e: any) {
      if (e?.code === "EMAIL_NOT_VERIFIED" || e?.message?.toLowerCase().includes("verification")) {
        setupSkip = true;
      } else {
        throw e;
      }
    }
  });

  describe("getStats", () => {
    it("returns stats for a known link", async (ctx) => {
      if (setupSkip) ctx.skip();
      const stats = await client.analytics.getStats(shortCode);

      expect(stats.shortCode).toBe(shortCode);
      expect(typeof stats.totalClicks).toBe("number");
      expect(stats.totalClicks).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(stats.clicks)).toBe(true);
    });

    it("returns totalClicks of 0 for a newly created link", async (ctx) => {
      if (setupSkip) ctx.skip();
      const stats = await client.analytics.getStats(shortCode);
      expect(stats.totalClicks).toBe(0);
    });

    it("returns error for a non-existent short code", async (ctx) => {
      if (setupSkip) ctx.skip();
      let threw = false;
      try {
        await client.analytics.getStats("definitely-does-not-exist-xyz-" + Date.now());
      } catch (err) {
        threw = true;
        expect(err).toBeTruthy();
      }
      expect(threw).toBe(true);
    });
  });
});

// Mocked unit tests — no live API. These cover the new aggregate endpoint
// (`GET /api/v1/links/:shortPath/stats/aggregate`) which is staging-only.
describe("AnalyticsResource.getAggregateStats (mocked)", () => {
  let http: HttpClient;
  let analytics: AnalyticsResource;

  beforeEach(() => {
    http = mockHttp();
    analytics = new AnalyticsResource(http);
  });

  it("GETs the aggregate path with the period query and parses a paid-tier response", async () => {
    const expected: AggregateStats = {
      shortCode: "abc123",
      fullPath: "acme/abc123",
      period: "30d",
      totalClicks: 540,
      uniqueVisitors: 410,
      clicksByDay: [
        { date: "2026-06-26", clicks: 20 },
        { date: "2026-06-27", clicks: 30 },
      ],
      countryBreakdown: { US: 300, DE: 120, CA: 120 },
      tierLimit: 90,
      tier: "pro",
      deviceBreakdown: { mobile: 200, desktop: 300, tablet: 40 },
      referrerBreakdown: { "twitter.com": 100, direct: 440 },
      browserBreakdown: { Chrome: 400, Safari: 140 },
      osBreakdown: { iOS: 150, macOS: 250, Windows: 140 },
      hourBreakdown: [{ hour: 9, clicks: 50 }],
      sourceBreakdown: { newsletter: 80 },
      utmBreakdown: {
        sources: { newsletter: 80 },
        mediums: { email: 80 },
        campaigns: { launch: 80 },
      },
    };
    vi.mocked(http.get).mockResolvedValue(expected);

    const result = await analytics.getAggregateStats("abc123", { period: "30d" });

    expect(http.get).toHaveBeenCalledWith(
      "/api/v1/links/abc123/stats/aggregate",
      { period: "30d" },
    );
    expect(result).toEqual(expected);
    expect(result.deviceBreakdown).toEqual({ mobile: 200, desktop: 300, tablet: 40 });
    expect(result.utmBreakdown?.campaigns.launch).toBe(80);
  });

  it("omits the period param when not provided (defaults server-side)", async () => {
    vi.mocked(http.get).mockResolvedValue({
      shortCode: "abc123",
      fullPath: null,
      period: "7d",
      totalClicks: 0,
      uniqueVisitors: 0,
      clicksByDay: [],
      countryBreakdown: {},
      tierLimit: 7,
      tier: "free",
    });

    await analytics.getAggregateStats("abc123");

    expect(http.get).toHaveBeenCalledWith(
      "/api/v1/links/abc123/stats/aggregate",
      {},
    );
  });

  it("URL-encodes a namespaced short path", async () => {
    vi.mocked(http.get).mockResolvedValue({
      shortCode: "slug",
      fullPath: "ns/slug",
      period: "7d",
      totalClicks: 0,
      uniqueVisitors: 0,
      clicksByDay: [],
      countryBreakdown: {},
      tierLimit: 7,
      tier: "free",
    });

    await analytics.getAggregateStats("ns/slug", { period: "7d" });

    expect(http.get).toHaveBeenCalledWith(
      "/api/v1/links/ns%2Fslug/stats/aggregate",
      { period: "7d" },
    );
  });

  it("parses a free-tier response with countryBreakdown + upgradeForMore", async () => {
    const expected: AggregateStats = {
      shortCode: "free99",
      fullPath: null,
      period: "7d",
      totalClicks: 12,
      uniqueVisitors: 10,
      clicksByDay: [{ date: "2026-06-27", clicks: 12 }],
      countryBreakdown: { US: 8, MX: 4 },
      tierLimit: 7,
      tier: "free",
      upgradeForMore: {
        available: ["devices", "referrers", "browsers"],
        message: "Upgrade to Pro to unlock device, referrer, and browser breakdowns.",
      },
    };
    vi.mocked(http.get).mockResolvedValue(expected);

    const result = await analytics.getAggregateStats("free99", { period: "7d" });

    expect(result.upgradeForMore?.available).toContain("devices");
    expect(result.deviceBreakdown).toBeUndefined();
    expect(result.countryBreakdown).toEqual({ US: 8, MX: 4 });
  });
});
