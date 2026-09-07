import { describe, it, expect, vi, beforeEach } from "vitest";
import { UtmTemplatesResource } from "../src/resources/utmTemplates.js";
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

describe("UtmTemplatesResource", () => {
  let http: HttpClient;
  let utmTemplates: UtmTemplatesResource;

  beforeEach(() => {
    http = mockHttp();
    utmTemplates = new UtmTemplatesResource(http);
  });

  describe("list", () => {
    it("calls GET /api/v1/me and returns utmTemplates array", async () => {
      const templates = [
        { id: "t1", name: "Summer Campaign", source: "email", medium: "newsletter", campaign: "summer" },
      ];
      vi.mocked(http.get).mockResolvedValue({ utmTemplates: templates });

      const result = await utmTemplates.list();

      expect(http.get).toHaveBeenCalledWith("/api/v1/me");
      expect(result).toEqual(templates);
    });

    it("returns empty array when utmTemplates is missing from response", async () => {
      vi.mocked(http.get).mockResolvedValue({ uid: "user1", email: "a@b.com" });

      const result = await utmTemplates.list();
      expect(result).toEqual([]);
    });
  });

  describe("create", () => {
    it("normalizes source/medium/campaign to the wire fields utmSource/utmMedium/utmCampaign", async () => {
      const opts = { name: "Launch", source: "twitter", medium: "social", campaign: "launch" };
      const expected = { id: "t2", name: "Launch" };
      vi.mocked(http.post).mockResolvedValue(expected);

      const result = await utmTemplates.create(opts);

      expect(http.post).toHaveBeenCalledWith("/api/user/utm-templates", {
        name: "Launch",
        utmSource: "twitter",
        utmMedium: "social",
        utmCampaign: "launch",
      });
      expect(result).toEqual(expected);
    });

    it("prefers utmSource/utmMedium/utmCampaign when both old and new fields are given", async () => {
      vi.mocked(http.post).mockResolvedValue({ id: "t2", name: "Launch" });

      await utmTemplates.create({
        name: "Launch",
        source: "ignored",
        utmSource: "twitter",
        utmMedium: "social",
        utmCampaign: "launch",
      });

      expect(http.post).toHaveBeenCalledWith("/api/user/utm-templates", {
        name: "Launch",
        utmSource: "twitter",
        utmMedium: "social",
        utmCampaign: "launch",
      });
    });

    it("includes optional term and content fields when provided", async () => {
      const opts = {
        name: "Detailed",
        utmSource: "google",
        utmMedium: "cpc",
        utmCampaign: "brand",
        term: "url shortener",
        content: "ad-variant-b",
      };
      vi.mocked(http.post).mockResolvedValue({ id: "t3", ...opts });

      await utmTemplates.create(opts);

      expect(http.post).toHaveBeenCalledWith("/api/user/utm-templates", {
        name: "Detailed",
        utmSource: "google",
        utmMedium: "cpc",
        utmCampaign: "brand",
        term: "url shortener",
        content: "ad-variant-b",
      });
    });
  });

  describe("delete", () => {
    it("calls DELETE /api/user/utm-templates/:id", async () => {
      vi.mocked(http.delete).mockResolvedValue({ success: true });

      const result = await utmTemplates.delete("t1");

      expect(http.delete).toHaveBeenCalledWith("/api/user/utm-templates/t1");
      expect(result).toEqual({ success: true });
    });
  });
});
