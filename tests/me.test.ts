import { describe, it, expect } from "vitest";
import { AwsysClient } from "../src/index.js";

const client = new AwsysClient({
  apiKey: process.env.AWSYS_API_KEY!,
  baseUrl: process.env.AWSYS_BASE_URL ?? "https://staging.awsys.co",
});

describe("Me", () => {
  describe("get", () => {
    it("returns authenticated user profile with required fields", async () => {
      const me = await client.me.get();

      expect(me.uid).toBeTruthy();
      expect(me.email).toBeTruthy();
      expect(me.email).toContain("@");
      expect(me.subscriptionTier).toBeTruthy();
    });

    it("returns subscriptionTier as a non-empty string", async () => {
      const me = await client.me.get();

      expect(typeof me.subscriptionTier).toBe("string");
      expect(me.subscriptionTier.length).toBeGreaterThan(0);
    });

    it("returns features object when present", async () => {
      const me = await client.me.get();

      if (me.features) {
        expect(typeof me.features.apiAccess).toBe("boolean");
        expect(typeof me.features.customSlugs).toBe("boolean");
        expect(typeof me.features.analyticsRetentionDays).toBe("number");
      }
    });

    it("returns limits object when present", async () => {
      const me = await client.me.get();

      if (me.limits) {
        // apiCallsPerMonth can be null (unlimited) or a number
        const { apiCallsPerMonth, dailyLinks } = me.limits;
        expect(
          apiCallsPerMonth === null || typeof apiCallsPerMonth === "number",
        ).toBe(true);
        expect(
          dailyLinks === null || typeof dailyLinks === "number",
        ).toBe(true);
      }
    });
  });
});
