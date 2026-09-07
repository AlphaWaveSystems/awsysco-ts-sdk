import type { HttpClient } from "../http.js";
import { paths } from "../paths.js";
import type { UsageStats } from "../types.js";

type RawUsageStats = Omit<UsageStats, "linksCreatedThisMonth">;

export class UsageResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get the authenticated user's live consumption stats.
   *
   * This returns the user's *current* usage against their plan limits
   * (links/clicks/QR codes/API calls used this period, overage state, etc.).
   *
   * This is distinct from {@link MeResource.get} (`client.me.get()`), which
   * returns the static profile and plan limits — not live consumption.
   */
  async get(): Promise<UsageStats> {
    const raw = await this.http.get<RawUsageStats>(paths.usage.stats);
    return {
      ...raw,
      // Legacy alias — kept for compat, mapped from the real wire field
      // rather than left permanently undefined.
      linksCreatedThisMonth: raw.linksCreatedToday,
    };
  }
}
