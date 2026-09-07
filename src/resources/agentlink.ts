import type { HttpClient } from "../http.js";
import { paths } from "../paths.js";
import type { AgentLinkStats } from "../types.js";

export class AgentlinkResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Subscribe an email address to AgentLink updates.
   * This is a public endpoint.
   *
   * @param email - The email address to subscribe
   */
  async subscribe(email: string): Promise<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(paths.agentlink.subscribe, { email });
  }

  /**
   * Get AgentLink click statistics for a specific link.
   *
   * @param shortPath - The short code or namespaced path
   * @param periodDays - Number of days to look back (default: 7)
   */
  async getLinkStats(shortPath: string, periodDays?: number): Promise<AgentLinkStats> {
    const params: Record<string, string | number> = {};
    if (periodDays !== undefined) params.period = periodDays;
    return this.http.get<AgentLinkStats>(paths.agentlink.linkStats(shortPath), params);
  }

  /**
   * Get aggregate AgentLink statistics for the authenticated user's account.
   *
   * @param periodDays - Number of days to look back (default: 7)
   */
  async getAccountStats(periodDays?: number): Promise<AgentLinkStats> {
    const params: Record<string, string | number> = {};
    if (periodDays !== undefined) params.period = periodDays;
    return this.http.get<AgentLinkStats>(paths.agentlink.accountStats, params);
  }
}
