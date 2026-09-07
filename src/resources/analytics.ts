import type { HttpClient } from "../http.js";
import { paths } from "../paths.js";
import type {
  AggregateAnalytics,
  GetRecentClicksOptions,
  LinkStats,
  RecentClicksResult,
} from "../types.js";

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
    return this.http.get<LinkStats>(paths.links.stats(shortPath), params);
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
  ): Promise<AggregateAnalytics> {
    const params: Record<string, string | number> = {};
    if (opts?.period !== undefined) params.period = opts.period;
    return this.http.get<AggregateAnalytics>(
      paths.links.aggregateStats(shortPath),
      params,
    );
  }

  /**
   * Get the most recent clicks across all links for the authenticated user.
   *
   * Requires the "Live Globe" feature flag to be enabled on the account —
   * throws {@link AwsysForbiddenError} with `code: "FEATURE_DISABLED"` otherwise.
   *
   * @param opts.limit - Maximum number of recent click events to return
   * @param opts.since - ISO 8601 timestamp; only return clicks after this time
   */
  async getRecentClicks(opts?: GetRecentClicksOptions): Promise<RecentClicksResult> {
    const params: Record<string, string | number> = {};
    if (opts?.limit !== undefined) params.limit = opts.limit;
    if (opts?.since !== undefined) params.since = opts.since;
    return this.http.get<RecentClicksResult>(paths.analytics.recentClicks, params);
  }
}
