import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProfileResource } from "../src/resources/profile.js";
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

describe("ProfileResource", () => {
  let http: HttpClient;
  let profile: ProfileResource;

  beforeEach(() => {
    http = mockHttp();
    profile = new ProfileResource(http);
  });

  describe("get", () => {
    it("GETs /api/user/profile", async () => {
      const expected = {
        uid: "u1",
        email: "t@example.com",
        displayName: "T",
        subscriptionTier: "pro",
      };
      vi.mocked(http.get).mockResolvedValue(expected);

      const result = await profile.get();

      expect(http.get).toHaveBeenCalledWith("/api/user/profile");
      expect(result).toEqual(expected);
    });
  });

  describe("update", () => {
    it("PATCHes /api/user/profile with the given fields", async () => {
      vi.mocked(http.patch).mockResolvedValue({
        success: true,
        displayName: "New",
      });

      const result = await profile.update({ displayName: "New" });

      expect(http.patch).toHaveBeenCalledWith("/api/user/profile", {
        displayName: "New",
      });
      expect(result).toEqual({ success: true, displayName: "New" });
    });
  });
});
