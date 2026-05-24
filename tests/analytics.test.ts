import { describe, it, expect, beforeAll } from "vitest";
import { AwsysClient, AwsysNotFoundError } from "../src/index.js";

const client = new AwsysClient({
  apiKey: process.env.AWSYS_API_KEY!,
  baseUrl: process.env.AWSYS_BASE_URL ?? "https://staging.awsys.co",
});

describe("Analytics", () => {
  let shortCode: string;

  beforeAll(async () => {
    // Create a link to run analytics against
    const result = await client.links.create({
      url: `https://example.com/sdk-analytics-test-${Date.now()}`,
    });
    shortCode = result.shortCode;
  });

  describe("getStats", () => {
    it("returns stats for a known link", async () => {
      const stats = await client.analytics.getStats(shortCode);

      expect(stats.shortCode).toBe(shortCode);
      expect(typeof stats.totalClicks).toBe("number");
      expect(stats.totalClicks).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(stats.clicks)).toBe(true);
    });

    it("returns totalClicks of 0 for a newly created link", async () => {
      const stats = await client.analytics.getStats(shortCode);
      expect(stats.totalClicks).toBe(0);
    });

    it("returns error for a non-existent short code", async () => {
      let threw = false;
      try {
        await client.analytics.getStats("definitely-does-not-exist-xyz-" + Date.now());
      } catch (err) {
        threw = true;
        // The API returns 404 for unknown codes
        expect(err).toBeTruthy();
      }
      expect(threw).toBe(true);
    });
  });
});
