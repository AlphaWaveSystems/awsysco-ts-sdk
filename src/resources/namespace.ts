import type { HttpClient } from "../http.js";
import { paths } from "../paths.js";
import type { NamespaceCheckResult, NamespaceInfo } from "../types.js";

export class NamespaceResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get the authenticated user's current namespace info.
   */
  async get(): Promise<NamespaceInfo> {
    return this.http.get<NamespaceInfo>(paths.namespace.base);
  }

  /**
   * Check whether a namespace is available to claim.
   *
   * @param namespace - The namespace string to check
   */
  async check(namespace: string): Promise<NamespaceCheckResult> {
    return this.http.get<NamespaceCheckResult>(paths.namespace.check(namespace));
  }

  /**
   * Claim a namespace for the authenticated user.
   *
   * @param namespace - The namespace to claim
   */
  async claim(namespace: string): Promise<NamespaceInfo> {
    return this.http.post<NamespaceInfo>(paths.namespace.base, { namespace });
  }

  /**
   * Release the authenticated user's current namespace.
   */
  async release(): Promise<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(paths.namespace.base);
  }
}
