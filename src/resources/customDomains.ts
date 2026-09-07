import { AwsysForbiddenError } from "../errors.js";
import type { HttpClient, RequestOptions } from "../http.js";
import { paths } from "../paths.js";
import type { AddDomainResult, CustomDomain } from "../types.js";

let activateDeprecationWarned = false;

export class CustomDomainsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List all custom domains for the authenticated user.
   */
  async list(
    options?: RequestOptions,
  ): Promise<{ domains: CustomDomain[]; monthlyPrice?: number }> {
    return this.http.get<{ domains: CustomDomain[]; monthlyPrice?: number }>(
      paths.customDomains.base,
      undefined,
      options,
    );
  }

  /**
   * Add a new custom domain.
   *
   * @param domain - The domain to add (e.g. "links.example.com")
   */
  async add(domain: string, options?: RequestOptions): Promise<AddDomainResult> {
    return this.http.post<AddDomainResult>(paths.customDomains.base, { domain }, options);
  }

  /**
   * Verify DNS records for a custom domain.
   *
   * @param domain - The domain to verify
   */
  async verify(
    domain: string,
    options?: RequestOptions,
  ): Promise<{ verified: boolean; domain: string; status: string }> {
    return this.http.get<{ verified: boolean; domain: string; status: string }>(
      paths.customDomains.verify(domain),
      undefined,
      options,
    );
  }

  /**
   * @deprecated Firebase-only (`requireAuthStrict`) — not reachable with an
   * API key (ADR-006). Always throws {@link AwsysForbiddenError}; the SDK
   * never makes this network call. Activate domains from the AWSYS
   * dashboard instead. Will be removed in the next major version.
   *
   * @param _domain - The domain that would be activated (unused — the SDK
   * never calls the network for this deprecated method).
   */
  // eslint-disable-next-line @typescript-eslint/require-await -- stays async to keep the method's return type a Promise, matching every other resource method's signature.
  async activate(_domain: string): Promise<CustomDomain> {
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
    opts: { isDefault?: boolean; notFoundHtml?: string; defaultRedirect?: string },
    options?: RequestOptions,
  ): Promise<CustomDomain> {
    return this.http.patch<CustomDomain>(paths.customDomains.byDomain(domain), opts, options);
  }

  /**
   * Remove a custom domain.
   *
   * @param domain - The domain to remove
   */
  async remove(domain: string, options?: RequestOptions): Promise<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(paths.customDomains.byDomain(domain), options);
  }

  /**
   * Check whether a hostname is available as a custom domain.
   *
   * @param hostname - The hostname to check
   */
  async check(
    hostname: string,
    options?: RequestOptions,
  ): Promise<{ available: boolean; reason?: string }> {
    return this.http.get<{ available: boolean; reason?: string }>(
      paths.customDomains.check(hostname),
      undefined,
      options,
    );
  }
}
