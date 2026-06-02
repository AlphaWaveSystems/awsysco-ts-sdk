import { describe, it, expect, beforeAll } from "vitest";
import { AwsysClient } from "../src/index.js";

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
