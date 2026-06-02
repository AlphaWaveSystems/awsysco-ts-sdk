import type { HttpClient } from "../http.js";
import type { AddDomainResult, CustomDomain } from "../types.js";

export class CustomDomainsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List all custom domains for the authenticated user.
   */
  async list(): Promise<{ domains: CustomDomain[]; monthlyPrice?: number }> {
    return this.http.get<{ domains: CustomDomain[]; monthlyPrice?: number }>(
      "/api/user/domains",
    );
  }

  /**
   * Add a new custom domain.
   *
   * @param domain - The domain to add (e.g. "links.example.com")
   */
  async add(domain: string): Promise<AddDomainResult> {
    return this.http.post<AddDomainResult>("/api/user/domains", { domain });
  }

  /**
   * Verify DNS records for a custom domain.
   *
   * @param domain - The domain to verify
   */
  async verify(domain: string): Promise<{ verified: boolean; domain: string; status: string }> {
    return this.http.get<{ verified: boolean; domain: string; status: string }>(
      `/api/user/domains/${encodeURIComponent(domain)}/verify`,
    );
  }

  /**
   * Activate a verified custom domain.
   *
   * @param domain - The domain to activate
   */
  async activate(domain: string): Promise<CustomDomain> {
    return this.http.post<CustomDomain>(
      `/api/user/domains/${encodeURIComponent(domain)}/activate`,
    );
  }

  /**
   * Update a custom domain's settings.
   *
   * @param domain - The domain to update
   * @param opts - Fields to update
   */
  async update(
    domain: string,
    opts: { isDefault?: boolean; notFoundHtml?: string },
  ): Promise<CustomDomain> {
    return this.http.patch<CustomDomain>(
      `/api/user/domains/${encodeURIComponent(domain)}`,
      opts,
    );
  }

  /**
   * Remove a custom domain.
   *
   * @param domain - The domain to remove
   */
  async remove(domain: string): Promise<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `/api/user/domains/${encodeURIComponent(domain)}`,
    );
  }

  /**
   * Check whether a hostname is available as a custom domain.
   *
   * @param hostname - The hostname to check
   */
  async check(hostname: string): Promise<{ available: boolean; reason?: string }> {
    return this.http.get<{ available: boolean; reason?: string }>(
      `/api/domains/check/${encodeURIComponent(hostname)}`,
    );
  }
}
