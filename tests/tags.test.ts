import { describe, it, expect, vi, beforeEach } from "vitest";
import { TagsResource } from "../src/resources/tags.js";
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

describe("TagsResource", () => {
  let http: HttpClient;
  let tags: TagsResource;

  beforeEach(() => {
    http = mockHttp();
    tags = new TagsResource(http);
  });

  describe("add", () => {
    it("calls POST /api/link/:short/tags with { tag }", async () => {
      const expected = { success: true, tags: ["launch", "social"] };
      vi.mocked(http.post).mockResolvedValue(expected);

      const result = await tags.add("abc123", "social");

      expect(http.post).toHaveBeenCalledWith(
        "/api/link/abc123/tags",
        { tag: "social" },
      );
      expect(result).toEqual(expected);
    });

    it("URL-encodes namespaced short paths", async () => {
      vi.mocked(http.post).mockResolvedValue({ success: true, tags: ["x"] });

      await tags.add("ns/slug", "x");

      expect(http.post).toHaveBeenCalledWith(
        "/api/link/ns%2Fslug/tags",
        { tag: "x" },
      );
    });
  });

  describe("remove", () => {
    it("calls DELETE /api/link/:short/tags/:tag", async () => {
      const expected = { success: true, tags: ["launch"] };
      vi.mocked(http.delete).mockResolvedValue(expected);

      const result = await tags.remove("abc123", "social");

      expect(http.delete).toHaveBeenCalledWith(
        "/api/link/abc123/tags/social",
      );
      expect(result).toEqual(expected);
    });

    it("URL-encodes tags with special characters", async () => {
      vi.mocked(http.delete).mockResolvedValue({ success: true, tags: [] });

      await tags.remove("abc123", "my tag");

      expect(http.delete).toHaveBeenCalledWith(
        "/api/link/abc123/tags/my%20tag",
      );
    });
  });
});
