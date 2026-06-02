import { describe, it, expect, vi, beforeEach } from "vitest";
import { NamespaceResource } from "../src/resources/namespace.js";
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

describe("NamespaceResource", () => {
  let http: HttpClient;
  let namespace: NamespaceResource;

  beforeEach(() => {
    http = mockHttp();
    namespace = new NamespaceResource(http);
  });

  describe("get", () => {
    it("calls GET /api/user/namespace and returns NamespaceInfo", async () => {
      const expected = {
        hasAccess: true,
        namespace: "myns",
        tier: "pro",
      };
      vi.mocked(http.get).mockResolvedValue(expected);

      const result = await namespace.get();

      expect(http.get).toHaveBeenCalledWith("/api/user/namespace");
      expect(result).toEqual(expected);
    });

    it("returns upgradeRequired when on a lower tier", async () => {
      const expected = {
        hasAccess: false,
        namespace: null,
        tier: "free",
        upgradeRequired: true,
      };
      vi.mocked(http.get).mockResolvedValue(expected);

      const result = await namespace.get();
      expect(result.upgradeRequired).toBe(true);
    });
  });

  describe("check", () => {
    it("calls GET /api/namespace/check/:namespace", async () => {
      const expected = {
        namespace: "myns",
        available: true,
        reason: null,
        previewUrl: "https://awsys.co/myns/",
      };
      vi.mocked(http.get).mockResolvedValue(expected);

      const result = await namespace.check("myns");

      expect(http.get).toHaveBeenCalledWith("/api/namespace/check/myns");
      expect(result).toEqual(expected);
    });

    it("returns available=false with reason when taken", async () => {
      const expected = {
        namespace: "taken",
        available: false,
        reason: "Already in use",
        previewUrl: null,
      };
      vi.mocked(http.get).mockResolvedValue(expected);

      const result = await namespace.check("taken");
      expect(result.available).toBe(false);
      expect(result.reason).toBe("Already in use");
    });
  });

  describe("claim", () => {
    it("calls POST /api/user/namespace with { namespace }", async () => {
      const expected = { hasAccess: true, namespace: "myns", tier: "pro" };
      vi.mocked(http.post).mockResolvedValue(expected);

      const result = await namespace.claim("myns");

      expect(http.post).toHaveBeenCalledWith("/api/user/namespace", { namespace: "myns" });
      expect(result).toEqual(expected);
    });
  });

  describe("release", () => {
    it("calls DELETE /api/user/namespace", async () => {
      vi.mocked(http.delete).mockResolvedValue({ success: true });

      const result = await namespace.release();

      expect(http.delete).toHaveBeenCalledWith("/api/user/namespace");
      expect(result).toEqual({ success: true });
    });
  });
});
