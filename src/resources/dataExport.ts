import type { HttpClient } from "../http.js";

export class DataExportResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Export all links for the authenticated user as a CSV string.
   *
   * @returns Raw CSV text
   */
  async exportLinks(): Promise<string> {
    return this.http.getText("/api/export/links");
  }

  /**
   * Export click statistics for a specific link as a CSV string.
   *
   * @param shortPath - The short code or namespaced path
   * @returns Raw CSV text
   */
  async exportLinkStats(shortPath: string): Promise<string> {
    return this.http.getText(
      `/api/export/stats/${encodeURIComponent(shortPath)}`,
    );
  }
}
