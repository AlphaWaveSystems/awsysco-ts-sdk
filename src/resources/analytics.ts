import type { HttpClient, RequestOptions } from "../http.js";
import { paths } from "../paths.js";
import { mapTimestampFields } from "../timestamps.js";
import type {
  AggregateAnalytics,
  GetRecentClicksOptions,
  LinkStats,
  RecentClicksResult,
} from "../types.js";

function mapLinkStats(raw: LinkStats): LinkStats {
  return {
    ...raw,
    clicks: (raw.clicks ?? []).map((click) => mapTimestampFields(click, ["timestamp"])),
  };
}

function mapRecentClicksResult(raw: RecentClicksResult): RecentClicksResult {
  return {
    ...raw,
    clicks: (raw.clicks ?? []).map((click) => mapTimestampFields(click, ["timestamp"])),
  };
}

export class AnalyticsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get click statistics for a link.
   *
   * @param shortPath - The short code or namespaced path (e.g. "abc123" or "ns/slug")
   * @param period - Optional time period (e.g. "7d", "30d"). Defaults to all time.
   * @returns Link statistics including total clicks and click history
   */
  async getStats(
    shortPath: string,
    period?: string,
    options?: RequestOptions,
  ): Promise<LinkStats> {
    const params: Record<string, string | number> = {};
    if (period !== undefined) params.period = period;
    const raw = await this.http.get<LinkStats>(paths.links.stats(shortPath), params, options);
    return mapLinkStats(raw);
  }

  /**
   * Get rich aggregated analytics for a link over a time window.
   *
   * The free tier returns `countryBreakdown` plus an `upgradeForMore` hint;
   * paid tiers additionally return device/referrer/browser/os/hour/source/utm
   * breakdowns depending on the plan.
   *
   * @param shortPath - The short code or namespaced path (e.g. "abc123" or "ns/slug")
   * @param opts - Optional window (`period`: "7d" default, "30d", or "90d")
   *   plus a per-call `signal`/`timeoutMs` override
   * @returns Aggregated stats including clicks-by-day and dimension breakdowns
   */
  async getAggregateStats(
    shortPath: string,
    opts?: { period?: "7d" | "30d" | "90d" } & RequestOptions,
  ): Promise<AggregateAnalytics> {
    const params: Record<string, string | number> = {};
    if (opts?.period !== undefined) params.period = opts.period;
    return this.http.get<AggregateAnalytics>(paths.links.aggregateStats(shortPath), params, {
      signal: opts?.signal,
      timeoutMs: opts?.timeoutMs,
    });
  }

  /**
   * Get the most recent clicks across all links for the authenticated user.
   *
   * Requires the "Live Globe" feature flag to be enabled on the account —
   * throws {@link AwsysForbiddenError} with `code: "FEATURE_DISABLED"` otherwise.
   *
   * @param limitOrOpts - Either a bare `limit` number (legacy call style, kept
   *   for backward compatibility per ADR-014) or an options object.
   * @param limitOrOpts.limit - Maximum number of recent click events to return
   * @param limitOrOpts.since - ISO 8601 timestamp; only return clicks after this time
   * @param options - Per-call `signal`/`timeoutMs` override
   */
  async getRecentClicks(
    limitOrOpts?: number | GetRecentClicksOptions,
    options?: RequestOptions,
  ): Promise<RecentClicksResult> {
    const opts: GetRecentClicksOptions =
      typeof limitOrOpts === "number" ? { limit: limitOrOpts } : (limitOrOpts ?? {});
    const params: Record<string, string | number> = {};
    if (opts.limit !== undefined) params.limit = opts.limit;
    if (opts.since !== undefined) params.since = opts.since;
    const raw = await this.http.get<RecentClicksResult>(
      paths.analytics.recentClicks,
      params,
      options,
    );
    return mapRecentClicksResult(raw);
  }
}
