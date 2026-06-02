import type { HttpClient } from "../http.js";
import type { TrustScoreResult } from "../types.js";

export class TrustScoreResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Scan a shortened link and return its trust/safety score.
   * This is a public endpoint — no authentication is required, but the API key
   * will be sent if available.
   *
   * @param shortPath - The short code or namespaced path to scan
   */
  async scan(shortPath: string): Promise<TrustScoreResult> {
    return this.http.get<TrustScoreResult>(
      `/api/link-scan/${encodeURIComponent(shortPath)}`,
    );
  }
}
