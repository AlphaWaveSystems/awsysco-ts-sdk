import { describe, it, expect, vi, beforeEach } from "vitest";
import { SavedViewsResource } from "../src/resources/savedViews.js";
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

const sampleView = {
  id: "v1",
  name: "Active Links",
  filters: { status: "active", folderId: "f1" },
  createdAt: "2026-06-01T00:00:00Z",
  updatedAt: "2026-06-01T00:00:00Z",
};

describe("SavedViewsResource", () => {
  let http: HttpClient;
  let savedViews: SavedViewsResource;

  beforeEach(() => {
    http = mockHttp();
    savedViews = new SavedViewsResource(http);
  });

  describe("list", () => {
    it("calls GET /api/views and returns views list", async () => {
      const expected = { views: [sampleView] };
      vi.mocked(http.get).mockResolvedValue(expected);

      const result = await savedViews.list();

      expect(http.get).toHaveBeenCalledWith("/api/views");
      expect(result.views).toHaveLength(1);
    });
  });

  describe("create", () => {
    it("calls POST /api/views with name and filters", async () => {
      const opts = { name: "Active Links", filters: { status: "active" } };
      vi.mocked(http.post).mockResolvedValue(sampleView);

      const result = await savedViews.create(opts);

      expect(http.post).toHaveBeenCalledWith("/api/views", opts);
      expect(result.id).toBe("v1");
    });
  });

  describe("update", () => {
    it("calls PATCH /api/views/:id with partial update", async () => {
      const updated = { ...sampleView, name: "Renamed View" };
      vi.mocked(http.patch).mockResolvedValue(updated);

      const result = await savedViews.update("v1", { name: "Renamed View" });

      expect(http.patch).toHaveBeenCalledWith("/api/views/v1", { name: "Renamed View" });
      expect(result.name).toBe("Renamed View");
    });
  });

  describe("delete", () => {
    it("calls DELETE /api/views/:id", async () => {
      vi.mocked(http.delete).mockResolvedValue(undefined);

      await savedViews.delete("v1");

      expect(http.delete).toHaveBeenCalledWith("/api/views/v1");
    });
  });
});
