import { describe, it, expect, vi, beforeEach } from "vitest";
import { AwsysForbiddenError } from "../src/errors.js";
import { CustomDomainsResource } from "../src/resources/customDomains.js";
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

const sampleDomain = {
  domain: "links.example.com",
  status: "active" as const,
  isDefault: false,
  linkCount: 12,
  createdAt: "2026-06-01T00:00:00Z",
};

describe("CustomDomainsResource", () => {
  let http: HttpClient;
  let customDomains: CustomDomainsResource;

  beforeEach(() => {
    http = mockHttp();
    customDomains = new CustomDomainsResource(http);
  });

  describe("list", () => {
    it("calls GET /api/user/domains and returns domains list", async () => {
      const expected = { domains: [sampleDomain], monthlyPrice: 5 };
      vi.mocked(http.get).mockResolvedValue(expected);

      const result = await customDomains.list();

      expect(http.get).toHaveBeenCalledWith("/api/user/domains");
      expect(result.domains).toHaveLength(1);
    });
  });

  describe("add", () => {
    it("calls POST /api/user/domains with { domain }", async () => {
      const expected = {
        domain: "links.example.com",
        status: "pending_txt",
        verificationToken: "verify-abc",
        txtRecord: { name: "_awsys-verify", type: "TXT", value: "verify-abc" },
        cnameRecord: { name: "links", type: "CNAME", value: "cname.awsys.co" },
      };
      vi.mocked(http.post).mockResolvedValue(expected);

      const result = await customDomains.add("links.example.com");

      expect(http.post).toHaveBeenCalledWith("/api/user/domains", { domain: "links.example.com" });
      expect(result.verificationToken).toBe("verify-abc");
    });
  });

  describe("verify", () => {
    it("calls GET /api/user/domains/:domain/verify", async () => {
      const expected = { verified: true, domain: "links.example.com", status: "verified" };
      vi.mocked(http.get).mockResolvedValue(expected);

      const result = await customDomains.verify("links.example.com");

      expect(http.get).toHaveBeenCalledWith(
        "/api/user/domains/links.example.com/verify",
      );
      expect(result.verified).toBe(true);
    });
  });

  describe("activate (deprecated — ADR-006)", () => {
    it("throws AwsysForbiddenError without making a network call", async () => {
      await expect(customDomains.activate("links.example.com")).rejects.toBeInstanceOf(
        AwsysForbiddenError,
      );
      expect(http.post).not.toHaveBeenCalled();
    });

    it("throws with a FIREBASE_AUTH_REQUIRED code and guidance message", async () => {
      await expect(customDomains.activate("links.example.com")).rejects.toMatchObject({
        code: "FIREBASE_AUTH_REQUIRED",
        message: expect.stringContaining("dashboard"),
      });
    });

    it("warns via console.warn only once per process", async () => {
      // The "warned" flag is module-level state, so re-import a fresh copy
      // of the module rather than relying on suite ordering against the
      // `customDomains` instance other tests in this file already called.
      vi.resetModules();
      const fresh = await import("../src/resources/customDomains.js");
      const freshDomains = new fresh.CustomDomainsResource(mockHttp());
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await freshDomains.activate("a.example.com").catch(() => {});
      await freshDomains.activate("b.example.com").catch(() => {});

      expect(warnSpy).toHaveBeenCalledTimes(1);
      warnSpy.mockRestore();
    });
  });

  describe("update", () => {
    it("calls PATCH /api/user/domains/:domain with options", async () => {
      const updated = { ...sampleDomain, isDefault: true };
      vi.mocked(http.patch).mockResolvedValue(updated);

      const result = await customDomains.update("links.example.com", { isDefault: true });

      expect(http.patch).toHaveBeenCalledWith(
        "/api/user/domains/links.example.com",
        { isDefault: true },
      );
      expect(result.isDefault).toBe(true);
    });
  });

  describe("remove", () => {
    it("calls DELETE /api/user/domains/:domain", async () => {
      vi.mocked(http.delete).mockResolvedValue({ success: true });

      const result = await customDomains.remove("links.example.com");

      expect(http.delete).toHaveBeenCalledWith(
        "/api/user/domains/links.example.com",
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe("check", () => {
    it("calls GET /api/domains/check/:hostname", async () => {
      const expected = { available: true };
      vi.mocked(http.get).mockResolvedValue(expected);

      const result = await customDomains.check("links.newdomain.com");

      expect(http.get).toHaveBeenCalledWith(
        "/api/domains/check/links.newdomain.com",
      );
      expect(result.available).toBe(true);
    });

    it("returns reason when domain is unavailable", async () => {
      const expected = { available: false, reason: "Domain is already in use" };
      vi.mocked(http.get).mockResolvedValue(expected);

      const result = await customDomains.check("awsys.co");
      expect(result.available).toBe(false);
      expect(result.reason).toBeTruthy();
    });
  });
});
