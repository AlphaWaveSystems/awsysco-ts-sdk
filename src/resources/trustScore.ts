import type { HttpClient, RequestOptions } from "../http.js";
import { paths } from "../paths.js";
import type { TrustScoreResult } from "../types.js";

interface RawTrustScoreResult {
  shortCode: string;
  trustScore: number | null;
  trustStatus: 'safe' | 'suspicious' | 'malicious' | 'unknown' | null;
  threats: string[];
  scannedAt?: string | null;
}

function mapTrustScoreResult(raw: RawTrustScoreResult): TrustScoreResult {
  return {
    ...raw,
    // Legacy aliases (short/score/status) — kept for compat, mapped from
    // the real wire fields rather than left permanently undefined.
    short: raw.shortCode,
    score: raw.trustScore,
    status: raw.trustStatus,
  };
}

export class TrustScoreResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Scan a shortened link and return its trust/safety score.
   *
   * This route is optionalAuth: the API key is sent automatically (every
   * request carries it), but note that non-owners scanning a link they
   * don't own will have `destination`-adjacent fields stripped server-side
   * if no key is presented at all (links.js:550+) — not a concern for this
   * SDK, which always has a key configured.
   *
   * @param shortPath - The short code or namespaced path to scan
   */
  async scan(shortPath: string, options?: RequestOptions): Promise<TrustScoreResult> {
    const raw = await this.http.get<RawTrustScoreResult>(
      paths.trustScore.scan(shortPath),
      undefined,
      options,
    );
    return mapTrustScoreResult(raw);
  }
}
