import { AwsysForbiddenError } from "../errors.js";
import type { HttpClient } from "../http.js";
import { paths } from "../paths.js";
import type { AddDomainResult, CustomDomain } from "../types.js";

let activateDeprecationWarned = false;

export class CustomDomainsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List all custom domains for the authenticated user.
   */
  async list(): Promise<{ domains: CustomDomain[]; monthlyPrice?: number }> {
    return this.http.get<{ domains: CustomDomain[]; monthlyPrice?: number }>(
      paths.customDomains.base,
    );
  }

  /**
   * Add a new custom domain.
   *
   * @param domain - The domain to add (e.g. "links.example.com")
   */
  async add(domain: string): Promise<AddDomainResult> {
    return this.http.post<AddDomainResult>(paths.customDomains.base, { domain });
  }

  /**
   * Verify DNS records for a custom domain.
   *
   * @param domain - The domain to verify
   */
  async verify(domain: string): Promise<{ verified: boolean; domain: string; status: string }> {
    return this.http.get<{ verified: boolean; domain: string; status: string }>(
      paths.customDomains.verify(domain),
    );
  }

  /**
   * @deprecated Firebase-only (`requireAuthStrict`) — not reachable with an
   * API key (ADR-006). Always throws {@link AwsysForbiddenError}; the SDK
   * never makes this network call. Activate domains from the AWSYS
   * dashboard instead. Will be removed in the next major version.
   *
   * @param domain - The domain to activate
   */
  async activate(domain: string): Promise<CustomDomain> {
    if (!activateDeprecationWarned) {
      activateDeprecationWarned = true;
      console.warn(
        "[@awsysco/sdk] customDomains.activate() is deprecated and will be removed in the next major version: " +
          "this endpoint requires Firebase auth and cannot be called with an API key. " +
          "Activate domains from the AWSYS dashboard instead.",
      );
    }
    throw new AwsysForbiddenError(
      "customDomains.activate() requires Firebase auth and cannot be called with an API key; " +
        "activate domains from the AWSYS dashboard instead.",
      "FIREBASE_AUTH_REQUIRED",
      undefined,
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
    return this.http.patch<CustomDomain>(paths.customDomains.byDomain(domain), opts);
  }

  /**
   * Remove a custom domain.
   *
   * @param domain - The domain to remove
   */
  async remove(domain: string): Promise<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(paths.customDomains.byDomain(domain));
  }

  /**
   * Check whether a hostname is available as a custom domain.
   *
   * @param hostname - The hostname to check
   */
  async check(hostname: string): Promise<{ available: boolean; reason?: string }> {
    return this.http.get<{ available: boolean; reason?: string }>(
      paths.customDomains.check(hostname),
    );
  }
}
