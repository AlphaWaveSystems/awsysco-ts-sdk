import { describe, it, expect, beforeAll } from "vitest";
import { AwsysClient } from "../src/index.js";

const client = new AwsysClient({
  apiKey: process.env.AWSYS_API_KEY!,
  baseUrl: process.env.AWSYS_BASE_URL ?? "https://staging.awsys.co",
});

describe("Links", () => {
  // Shared link created once for list/get tests
  let createdShortCode: string;

  beforeAll(async () => {
    const result = await client.links.create({
      url: `https://example.com/sdk-shared-${Date.now()}`,
    });
    createdShortCode = result.shortCode;
  });

  describe("create", () => {
    it("creates a link and returns shortUrl and shortCode", async () => {
      const result = await client.links.create({
        url: `https://example.com/sdk-create-${Date.now()}`,
      });

      expect(result.success).toBe(true);
      expect(result.shortUrl).toMatch(/^https?:\/\//);
      expect(result.shortCode).toBeTruthy();
      expect(result.long).toContain("example.com");
    });

    it("creates a link with maxClicks", async () => {
      const result = await client.links.create({
        url: `https://example.com/sdk-maxclicks-${Date.now()}`,
        maxClicks: 50,
      });

      expect(result.success).toBe(true);
      expect(result.maxClicks).toBe(50);
    });

    it("creates a link with expiresAt", async () => {
      const futureDate = new Date(Date.now() + 86400000 * 7).toISOString(); // 7 days
      const result = await client.links.create({
        url: `https://example.com/sdk-expiry-${Date.now()}`,
        expiresAt: futureDate,
      });

      expect(result.success).toBe(true);
      expect(result.expiresAt).toBeTruthy();
    });

    it("returns error for invalid/missing url", async () => {
      let threw = false;
      try {
        await client.links.create({ url: "" });
      } catch {
        threw = true;
      }
      expect(threw).toBe(true);
    });
  });

  describe("list", () => {
    it("lists links and returns paginated response shape", async () => {
      const result = await client.links.list({ limit: 5 });

      expect(Array.isArray(result.data)).toBe(true);
      expect(typeof result.total).toBe("number");
      expect(typeof result.hasMore).toBe("boolean");
    });

    it("respects limit parameter", async () => {
      const result = await client.links.list({ limit: 2 });
      expect(result.data.length).toBeLessThanOrEqual(2);
    });

    it("returns links with expected fields", async () => {
      const result = await client.links.list({ limit: 1 });

      if (result.data.length > 0) {
        const link = result.data[0];
        expect(link.id).toBeTruthy();
        expect(link.short).toBeTruthy();
        expect(link.long).toBeTruthy();
        expect(typeof link.clicks).toBe("number");
      }
    });
  });

  // Note: GET /api/v1/links/:shortPath, PATCH, and DELETE are production-only endpoints.
  // Staging implements only: create, list, stats, me, folders.
  // The SDK implements all endpoints for production compatibility.
  describe("get (production endpoint — staging returns 404)", () => {
    it("throws an error when the route does not exist on staging", async () => {
      // Staging returns HTML 404 for GET /api/v1/links/:code
      // The SDK should propagate the error (it won't be a typed AwsysNotFoundError
      // because staging returns HTML, not JSON)
      let threw = false;
      try {
        await client.links.get(createdShortCode);
      } catch {
        threw = true;
      }
      expect(threw).toBe(true);
    });
  });
});
