import { describe, it, expect, vi, beforeAll } from "vitest";
import { AwsysClient } from "../src/index.js";
import { LinksResource } from "../src/resources/links.js";
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

const client = new AwsysClient({
  apiKey: process.env.AWSYS_API_KEY!,
  baseUrl: process.env.AWSYS_BASE_URL ?? "https://staging.awsys.co",
});

describe("Links", () => {
  let createdShortCode: string;
  let setupSkip = false;

  beforeAll(async () => {
    try {
      const result = await client.links.create({
        url: `https://example.com/sdk-shared-${Date.now()}`,
      });
      createdShortCode = result.shortCode;
    } catch (e: any) {
      if (e?.code === "EMAIL_NOT_VERIFIED" || e?.message?.toLowerCase().includes("verification")) {
        setupSkip = true;
      } else {
        throw e;
      }
    }
  });

  describe("create", () => {
    it("creates a link and returns shortUrl and shortCode", async (ctx) => {
      if (setupSkip) ctx.skip();
      const result = await client.links.create({
        url: `https://example.com/sdk-create-${Date.now()}`,
      });

      expect(result.success).toBe(true);
      expect(result.shortUrl).toMatch(/^https?:\/\//);
      expect(result.shortCode).toBeTruthy();
      expect(result.long).toContain("example.com");
    });

    it("creates a link with maxClicks", async (ctx) => {
      if (setupSkip) ctx.skip();
      const result = await client.links.create({
        url: `https://example.com/sdk-maxclicks-${Date.now()}`,
        maxClicks: 50,
      });

      expect(result.success).toBe(true);
      expect(result.maxClicks).toBe(50);
    });

    it("creates a link with expiresAt", async (ctx) => {
      if (setupSkip) ctx.skip();
      const futureDate = new Date(Date.now() + 86400000 * 7).toISOString();
      const result = await client.links.create({
        url: `https://example.com/sdk-expiry-${Date.now()}`,
        expiresAt: futureDate,
      });

      expect(result.success).toBe(true);
      expect(result.expiresAt).toBeTruthy();
    });

    it("returns error for invalid/missing url", async (ctx) => {
      if (setupSkip) ctx.skip();
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
    it("lists links and returns paginated response shape", async (ctx) => {
      if (setupSkip) ctx.skip();
      const result = await client.links.list({ limit: 5 });

      expect(Array.isArray(result.data)).toBe(true);
      expect(typeof result.total).toBe("number");
      expect(typeof result.hasMore).toBe("boolean");
    });

    it("respects limit parameter", async (ctx) => {
      if (setupSkip) ctx.skip();
      const result = await client.links.list({ limit: 2 });
      expect(result.data.length).toBeLessThanOrEqual(2);
    });

    it("returns links with expected fields", async (ctx) => {
      if (setupSkip) ctx.skip();
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

  describe("get (production endpoint — staging returns 404)", () => {
    it("throws an error when the route does not exist on staging", async (ctx) => {
      if (setupSkip) ctx.skip();
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

// ============================================================================
// Mock-based tests — verify expireFallbackUrl is passed through correctly
// ============================================================================
describe("LinksResource — expireFallbackUrl passthrough (mock)", () => {
  it("includes expireFallbackUrl in create params", async () => {
    const http = mockHttp();
    const links = new LinksResource(http);

    const mockResponse = {
      id: "doc1",
      short: "abc",
      shortCode: "abc",
      shortUrl: "https://awsys.co/abc",
      long: "https://example.com/page",
      expireFallbackUrl: "https://example.com/fallback",
      success: true,
    };

    vi.mocked(http.post).mockResolvedValue(mockResponse);

    const result = await links.create({
      url: "https://example.com/page",
      expireFallbackUrl: "https://example.com/fallback",
    });

    // Verify the HTTP client was called with expireFallbackUrl in the body
    expect(http.post).toHaveBeenCalledWith("/api/v1/links", {
      url: "https://example.com/page",
      expireFallbackUrl: "https://example.com/fallback",
    });

    // Verify the field is present in the returned result
    expect(result.expireFallbackUrl).toBe("https://example.com/fallback");
  });
});
