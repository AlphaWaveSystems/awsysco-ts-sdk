import type { HttpClient, RequestOptions } from "../http.js";
import { paths } from "../paths.js";
import { mapTimestampFields } from "../timestamps.js";
import type {
  AffiliateLimits,
  AffiliatePartner,
  AffiliatePartnership,
  AffiliateProgram,
  AffiliateProgramSummary,
  CreateAffiliateProgramOptions,
} from "../types.js";

function mapAffiliateProgram(raw: AffiliateProgram): AffiliateProgram {
  return mapTimestampFields(raw, ["createdAt", "updatedAt"]);
}

function mapAffiliatePartnership(raw: AffiliatePartnership): AffiliatePartnership {
  return mapTimestampFields(raw, ["createdAt", "updatedAt"]);
}

export class AffiliateResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create a new affiliate program.
   */
  async createProgram(
    opts: CreateAffiliateProgramOptions,
    options?: RequestOptions,
  ): Promise<AffiliateProgram> {
    const raw = await this.http.post<AffiliateProgram>(paths.affiliate.programs, opts, options);
    return mapAffiliateProgram(raw);
  }

  /**
   * List all affiliate programs owned by the authenticated user.
   */
  async listPrograms(options?: RequestOptions): Promise<AffiliateProgram[]> {
    const raw = await this.http.get<{ programs: AffiliateProgram[] }>(
      paths.affiliate.programs,
      undefined,
      options,
    );
    return (raw.programs ?? []).map(mapAffiliateProgram);
  }

  /**
   * Get a specific affiliate program by ID.
   */
  async getProgram(programId: string, options?: RequestOptions): Promise<AffiliateProgram> {
    const raw = await this.http.get<AffiliateProgram>(
      paths.affiliate.programById(programId),
      undefined,
      options,
    );
    return mapAffiliateProgram(raw);
  }

  /**
   * Update an affiliate program.
   */
  async updateProgram(
    programId: string,
    opts: Partial<CreateAffiliateProgramOptions>,
    options?: RequestOptions,
  ): Promise<AffiliateProgram> {
    const raw = await this.http.patch<AffiliateProgram>(
      paths.affiliate.programById(programId),
      opts,
      options,
    );
    return mapAffiliateProgram(raw);
  }

  /**
   * Get statistics for an affiliate program.
   *
   * @param programId - The program ID
   * @param period - Time period (e.g. "30d")
   */
  async getProgramStats(
    programId: string,
    period?: string,
    options?: RequestOptions,
  ): Promise<Record<string, unknown>> {
    const params: Record<string, string | number> = {};
    if (period !== undefined) params.period = period;
    return this.http.get<Record<string, unknown>>(
      paths.affiliate.programStats(programId),
      params,
      options,
    );
  }

  /**
   * List all partners for an affiliate program.
   */
  async listPartners(
    programId: string,
    options?: RequestOptions,
  ): Promise<AffiliatePartner[]> {
    const raw = await this.http.get<{ partners: AffiliatePartner[] }>(
      paths.affiliate.partners(programId),
      undefined,
      options,
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
    options?: RequestOptions,
  ): Promise<AffiliatePartner> {
    return this.http.patch<AffiliatePartner>(
      paths.affiliate.partner(programId, partnerId),
      { status },
      options,
    );
  }

  /**
   * Discover publicly listed affiliate programs.
   *
   * @param limit - Maximum number of programs to return
   */
  /**
   * Discover public affiliate programs run by other users.
   *
   * @remarks Returns `AffiliateProgramSummary`, not the full `AffiliateProgram`
   * — discover() is a public listing of other users' programs, so it never
   * includes `status` or owner-only fields (`merchantId`, `maxPartners`,
   * `isPublic`, timestamps). Use `getProgram()`/`listPrograms()` for a
   * program you own to get the full shape.
   */
  async discover(
    limit?: number,
    options?: RequestOptions,
  ): Promise<AffiliateProgramSummary[]> {
    const params: Record<string, string | number> = {};
    if (limit !== undefined) params.limit = limit;
    const raw = await this.http.get<{ programs: AffiliateProgramSummary[] }>(
      paths.affiliate.discover,
      params,
      options,
    );
    return raw.programs;
  }

  /**
   * Join an affiliate program as a partner.
   *
   * @param programId - The program ID to join
   * @param partnerCode - Optional referral/partner code
   */
  async join(
    programId: string,
    partnerCode?: string,
    options?: RequestOptions,
  ): Promise<AffiliatePartnership> {
    const body: Record<string, string> = {};
    if (partnerCode !== undefined) body.partnerCode = partnerCode;
    const raw = await this.http.post<AffiliatePartnership>(
      paths.affiliate.join(programId),
      body,
      options,
    );
    return mapAffiliatePartnership(raw);
  }

  /**
   * List all affiliate partnerships the authenticated user has joined.
   */
  async listPartnerships(options?: RequestOptions): Promise<AffiliatePartnership[]> {
    const raw = await this.http.get<{ partnerships: AffiliatePartnership[] }>(
      paths.affiliate.partnerships,
      undefined,
      options,
    );
    return (raw.partnerships ?? []).map(mapAffiliatePartnership);
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
    options?: RequestOptions,
  ): Promise<Record<string, unknown>> {
    const params: Record<string, string | number> = {};
    if (period !== undefined) params.period = period;
    return this.http.get<Record<string, unknown>>(
      paths.affiliate.partnershipStats(partnershipId),
      params,
      options,
    );
  }

  /**
   * Leave (delete) an affiliate partnership.
   *
   * @param partnershipId - The partnership ID to leave
   */
  async leaveProgram(
    partnershipId: string,
    options?: RequestOptions,
  ): Promise<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      paths.affiliate.partnershipById(partnershipId),
      options,
    );
  }

  /**
   * Get affiliate tier limits and current usage.
   */
  async getLimits(options?: RequestOptions): Promise<AffiliateLimits> {
    return this.http.get<AffiliateLimits>(paths.affiliate.limits, undefined, options);
  }
}
