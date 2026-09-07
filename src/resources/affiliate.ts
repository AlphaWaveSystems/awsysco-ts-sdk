import type { HttpClient } from "../http.js";
import { paths } from "../paths.js";
import type {
  AffiliatePartner,
  AffiliatePartnership,
  AffiliateProgram,
  CreateAffiliateProgramOptions,
} from "../types.js";

export class AffiliateResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create a new affiliate program.
   */
  async createProgram(opts: CreateAffiliateProgramOptions): Promise<AffiliateProgram> {
    return this.http.post<AffiliateProgram>(paths.affiliate.programs, opts);
  }

  /**
   * List all affiliate programs owned by the authenticated user.
   */
  async listPrograms(): Promise<AffiliateProgram[]> {
    const raw = await this.http.get<{ programs: AffiliateProgram[] }>(
      paths.affiliate.programs,
    );
    return raw.programs;
  }

  /**
   * Get a specific affiliate program by ID.
   */
  async getProgram(programId: string): Promise<AffiliateProgram> {
    return this.http.get<AffiliateProgram>(paths.affiliate.programById(programId));
  }

  /**
   * Update an affiliate program.
   */
  async updateProgram(
    programId: string,
    opts: Partial<CreateAffiliateProgramOptions>,
  ): Promise<AffiliateProgram> {
    return this.http.patch<AffiliateProgram>(paths.affiliate.programById(programId), opts);
  }

  /**
   * Get statistics for an affiliate program.
   *
   * @param programId - The program ID
   * @param period - Time period (e.g. "30d")
   */
  async getProgramStats(programId: string, period?: string): Promise<Record<string, unknown>> {
    const params: Record<string, string | number> = {};
    if (period !== undefined) params.period = period;
    return this.http.get<Record<string, unknown>>(paths.affiliate.programStats(programId), params);
  }

  /**
   * List all partners for an affiliate program.
   */
  async listPartners(programId: string): Promise<AffiliatePartner[]> {
    const raw = await this.http.get<{ partners: AffiliatePartner[] }>(
      paths.affiliate.partners(programId),
    );
    return raw.partners;
  }

  /**
   * Update the status of an affiliate partner.
   *
   * @param programId - The program ID
   * @param partnerId - The partner ID
   * @param status - The new status (e.g. "approved", "rejected")
   */
  async updatePartnerStatus(
    programId: string,
    partnerId: string,
    status: string,
  ): Promise<AffiliatePartner> {
    return this.http.patch<AffiliatePartner>(
      paths.affiliate.partner(programId, partnerId),
      { status },
    );
  }

  /**
   * Discover publicly listed affiliate programs.
   *
   * @param limit - Maximum number of programs to return
   */
  async discover(limit?: number): Promise<AffiliateProgram[]> {
    const params: Record<string, string | number> = {};
    if (limit !== undefined) params.limit = limit;
    const raw = await this.http.get<{ programs: AffiliateProgram[] }>(
      paths.affiliate.discover,
      params,
    );
    return raw.programs;
  }

  /**
   * Join an affiliate program as a partner.
   *
   * @param programId - The program ID to join
   * @param partnerCode - Optional referral/partner code
   */
  async join(programId: string, partnerCode?: string): Promise<AffiliatePartnership> {
    const body: Record<string, string> = {};
    if (partnerCode !== undefined) body.partnerCode = partnerCode;
    return this.http.post<AffiliatePartnership>(paths.affiliate.join(programId), body);
  }

  /**
   * List all affiliate partnerships the authenticated user has joined.
   */
  async listPartnerships(): Promise<AffiliatePartnership[]> {
    const raw = await this.http.get<{ partnerships: AffiliatePartnership[] }>(
      paths.affiliate.partnerships,
    );
    return raw.partnerships;
  }

  /**
   * Get statistics for a specific partnership.
   *
   * @param partnershipId - The partnership ID
   * @param period - Time period (e.g. "30d")
   */
  async getPartnershipStats(
    partnershipId: string,
    period?: string,
  ): Promise<Record<string, unknown>> {
    const params: Record<string, string | number> = {};
    if (period !== undefined) params.period = period;
    return this.http.get<Record<string, unknown>>(paths.affiliate.partnershipStats(partnershipId), params);
  }

  /**
   * Leave (delete) an affiliate partnership.
   *
   * @param partnershipId - The partnership ID to leave
   */
  async leaveProgram(partnershipId: string): Promise<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(paths.affiliate.partnershipById(partnershipId));
  }

  /**
   * Get affiliate tier limits and current usage.
   */
  async getLimits(): Promise<{ tier: string; limits: Record<string, unknown>; usage: Record<string, unknown> }> {
    return this.http.get<{ tier: string; limits: Record<string, unknown>; usage: Record<string, unknown> }>(
      paths.affiliate.limits,
    );
  }
}
