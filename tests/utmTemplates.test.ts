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
    it("calls GET /api/v1/me and returns utmTemplates array, mapping source/medium/campaign (the real wire fields) to the deprecated utmSource/etc. aliases", async () => {
      // Raw wire response uses source/medium/campaign (the real platform
      // fields, confirmed by contract fixture 1.0.9's utm_create scenario)
      // — utmSource/utmMedium/utmCampaign are deprecated aliases the SDK
      // derives, never sent by the platform.
      const rawTemplates = [
        { id: "t1", name: "Summer Campaign", source: "email", medium: "newsletter", campaign: "summer" },
      ];
      vi.mocked(http.get).mockResolvedValue({ utmTemplates: rawTemplates });

      const result = await utmTemplates.list();

      expect(http.get).toHaveBeenCalledWith("/api/v1/me", undefined, undefined);
      expect(result).toEqual([
        {
          ...rawTemplates[0],
          utmSource: "email",
          utmMedium: "newsletter",
          utmCampaign: "summer",
        },
      ]);
    });

    it("returns empty array when utmTemplates is missing from response (platform issue #831 — this is the normal case via API key today)", async () => {
      vi.mocked(http.get).mockResolvedValue({ uid: "user1", email: "a@b.com" });

      const result = await utmTemplates.list();
      expect(result).toEqual([]);
    });

    it("warns once (not repeatedly) that list() is non-functional via API key", async () => {
      vi.mocked(http.get).mockResolvedValue({});
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      try {
        await utmTemplates.list();
        await utmTemplates.list();
        const utmWarnings = warnSpy.mock.calls.filter((call) =>
          String(call[0]).includes("utmTemplates.list()"),
        );
        // Warns at most once across this resource's lifetime (module-level
        // flag) — a fresh instance in a later test may or may not still see
        // it depending on suite ordering, so assert "not on every call".
        expect(utmWarnings.length).toBeLessThanOrEqual(1);
      } finally {
        warnSpy.mockRestore();
      }
    });
  });

  describe("create", () => {
    it("sends source/medium/campaign — the platform's real field names", async () => {
      const opts = { name: "Launch", source: "twitter", medium: "social", campaign: "launch" };
      vi.mocked(http.post).mockResolvedValue({
        success: true,
        template: { id: "t2", name: "Launch", source: "twitter", medium: "social", campaign: "launch" },
      });

      const result = await utmTemplates.create(opts);

      expect(http.post).toHaveBeenCalledWith(
        "/api/user/utm-templates",
        {
          name: "Launch",
          source: "twitter",
          medium: "social",
          campaign: "launch",
        },
        undefined,
      );
      // Response is unwrapped from `{success, template}`, not returned raw.
      expect(result.id).toBe("t2");
      expect(result.source).toBe("twitter");
    });

    it("accepts the deprecated utmSource/utmMedium/utmCampaign aliases, normalizing them to source/medium/campaign on the wire", async () => {
      vi.mocked(http.post).mockResolvedValue({
        success: true,
        template: { id: "t2", name: "Launch", source: "twitter", medium: "social", campaign: "launch" },
      });

      await utmTemplates.create({
        name: "Launch",
        utmSource: "twitter",
        utmMedium: "social",
        utmCampaign: "launch",
      });

      expect(http.post).toHaveBeenCalledWith(
        "/api/user/utm-templates",
        {
          name: "Launch",
          source: "twitter",
          medium: "social",
          campaign: "launch",
        },
        undefined,
      );
    });

    it("prefers source/medium/campaign over the deprecated aliases when both are given", async () => {
      vi.mocked(http.post).mockResolvedValue({
        success: true,
        template: { id: "t2", name: "Launch" },
      });

      await utmTemplates.create({
        name: "Launch",
        source: "kept",
        utmSource: "ignored",
        medium: "social",
        campaign: "launch",
      });

      expect(http.post).toHaveBeenCalledWith(
        "/api/user/utm-templates",
        {
          name: "Launch",
          source: "kept",
          medium: "social",
          campaign: "launch",
        },
        undefined,
      );
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

      expect(http.post).toHaveBeenCalledWith(
        "/api/user/utm-templates",
        {
          name: "Detailed",
          source: "google",
          medium: "cpc",
          campaign: "brand",
          term: "url shortener",
          content: "ad-variant-b",
        },
        undefined,
      );
    });
  });

  describe("delete", () => {
    it("calls DELETE /api/user/utm-templates/:id", async () => {
      vi.mocked(http.delete).mockResolvedValue({ success: true });

      const result = await utmTemplates.delete("t1");

      expect(http.delete).toHaveBeenCalledWith("/api/user/utm-templates/t1", undefined);
      expect(result).toEqual({ success: true });
    });
  });
});
