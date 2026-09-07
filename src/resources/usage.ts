import type { HttpClient, RequestOptions } from "../http.js";
import { paths } from "../paths.js";
import { mapTimestampFields } from "../timestamps.js";
import type { UsageStats } from "../types.js";

function mapUsageStats(raw: UsageStats): UsageStats {
  return {
    ...mapTimestampFields(raw, ["apiKeyCreatedAt"]),
    overage: mapTimestampFields(raw.overage, ["startedAt", "expiresAt"]),
  };
}

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
   *
   * Every field on {@link UsageStats} maps 1:1 by name from the wire
   * response (verified live, see contract fixture 1.0.6's "usage" scenario)
   * — the only transformation applied is normalizing `apiKeyCreatedAt` and
   * `overage.startedAt`/`overage.expiresAt` from Firestore timestamp shapes
   * to ISO strings, same as every other resource.
   */
  async get(options?: RequestOptions): Promise<UsageStats> {
    const raw = await this.http.get<UsageStats>(paths.usage.stats, undefined, options);
    return mapUsageStats(raw);
  }
}
