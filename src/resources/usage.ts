import type { HttpClient } from "../http.js";
import type { UsageStats } from "../types.js";

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
    return this.http.get<UsageStats>("/api/user/stats");
  }
}
