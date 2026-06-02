import { describe, it, expect, vi, beforeEach } from "vitest";
import { DataExportResource } from "../src/resources/dataExport.js";
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

describe("DataExportResource", () => {
  let http: HttpClient;
  let dataExport: DataExportResource;

  beforeEach(() => {
    http = mockHttp();
    dataExport = new DataExportResource(http);
  });

  describe("exportLinks", () => {
    it("calls getText /api/export/links and returns CSV string", async () => {
      const csv = "short,long,clicks\nabc123,https://example.com,5\n";
      vi.mocked(http.getText).mockResolvedValue(csv);

      const result = await dataExport.exportLinks();

      expect(http.getText).toHaveBeenCalledWith("/api/export/links");
      expect(result).toBe(csv);
    });

    it("returns empty string when no links exist", async () => {
      vi.mocked(http.getText).mockResolvedValue("");

      const result = await dataExport.exportLinks();
      expect(result).toBe("");
    });
  });

  describe("exportLinkStats", () => {
    it("calls getText /api/export/stats/:short and returns CSV string", async () => {
      const csv = "timestamp,country,device\n2026-06-01T00:00:00Z,US,mobile\n";
      vi.mocked(http.getText).mockResolvedValue(csv);

      const result = await dataExport.exportLinkStats("abc123");

      expect(http.getText).toHaveBeenCalledWith(
        "/api/export/stats/abc123",
      );
      expect(result).toBe(csv);
    });

    it("URL-encodes namespaced short paths", async () => {
      vi.mocked(http.getText).mockResolvedValue("timestamp,country\n");

      await dataExport.exportLinkStats("ns/slug");

      expect(http.getText).toHaveBeenCalledWith("/api/export/stats/ns%2Fslug");
    });
  });
});
