import type { HttpClient } from "../http.js";
import type { AggregateStats, ClickEvent, LinkStats } from "../types.js";

export class AnalyticsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get click statistics for a link.
   *
   * @param shortPath - The short code or namespaced path (e.g. "abc123" or "ns/slug")
   * @param period - Optional time period (e.g. "7d", "30d"). Defaults to all time.
   * @returns Link statistics including total clicks and click history
   */
  async getStats(shortPath: string, period?: string): Promise<LinkStats> {
    const params: Record<string, string | number> = {};
    if (period !== undefined) params.period = period;
    return this.http.get<LinkStats>(
      `/api/v1/links/${encodeURIComponent(shortPath)}/stats`,
      params,
    );
  }

  /**
   * Get rich aggregated analytics for a link over a time window.
   *
   * The free tier returns `countryBreakdown` plus an `upgradeForMore` hint;
   * paid tiers additionally return device/referrer/browser/os/hour/source/utm
   * breakdowns depending on the plan.
   *
   * @param shortPath - The short code or namespaced path (e.g. "abc123" or "ns/slug")
   * @param period - Optional window: "7d" (default), "30d", or "90d"
   * @returns Aggregated stats including clicks-by-day and dimension breakdowns
   */
  async getAggregateStats(
    shortPath: string,
    opts?: { period?: "7d" | "30d" | "90d" },
  ): Promise<AggregateStats> {
    const params: Record<string, string | number> = {};
    if (opts?.period !== undefined) params.period = opts.period;
    return this.http.get<AggregateStats>(
      `/api/v1/links/${encodeURIComponent(shortPath)}/stats/aggregate`,
      params,
    );
  }

  /**
   * Get the most recent clicks across all links for the authenticated user.
   *
   * @param limit - Maximum number of recent click events to return
   */
  async getRecentClicks(limit?: number): Promise<ClickEvent[]> {
    const params: Record<string, string | number> = {};
    if (limit !== undefined) params.limit = limit;
    return this.http.get<ClickEvent[]>("/api/user/recent-clicks", params);
  }
}
