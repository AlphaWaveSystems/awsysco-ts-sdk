import type { HttpClient } from "../http.js";
import type { LinkStats } from "../types.js";

export class AnalyticsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get click statistics for a link.
   *
   * @param shortPath - The short code or namespaced path (e.g. "abc123" or "ns/slug")
   * @returns Link statistics including total clicks and click history
   */
  async getStats(shortPath: string): Promise<LinkStats> {
    return this.http.get<LinkStats>(
      `/api/v1/links/${encodeURIComponent(shortPath)}/stats`,
    );
  }
}
