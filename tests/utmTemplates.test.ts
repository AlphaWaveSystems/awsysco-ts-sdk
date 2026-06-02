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
    it("calls POST /api/user/utm-templates and returns the template", async () => {
      const opts = { name: "Launch", source: "twitter", medium: "social", campaign: "launch" };
      const expected = {
        success: true,
        template: { id: "t2", ...opts },
      };
      vi.mocked(http.post).mockResolvedValue(expected);

      const result = await utmTemplates.create(opts);

      expect(http.post).toHaveBeenCalledWith("/api/user/utm-templates", opts);
      expect(result).toEqual(expected);
    });

    it("includes optional term and content fields when provided", async () => {
      const opts = {
        name: "Detailed",
        source: "google",
        medium: "cpc",
        campaign: "brand",
        term: "url shortener",
        content: "ad-variant-b",
      };
      vi.mocked(http.post).mockResolvedValue({ success: true, template: { id: "t3", ...opts } });

      await utmTemplates.create(opts);

      expect(http.post).toHaveBeenCalledWith("/api/user/utm-templates", opts);
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
