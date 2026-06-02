import type { HttpClient } from "../http.js";
import type { NamespaceCheckResult, NamespaceInfo } from "../types.js";

export class NamespaceResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get the authenticated user's current namespace info.
   */
  async get(): Promise<NamespaceInfo> {
    return this.http.get<NamespaceInfo>("/api/user/namespace");
  }

  /**
   * Check whether a namespace is available to claim.
   *
   * @param namespace - The namespace string to check
   */
  async check(namespace: string): Promise<NamespaceCheckResult> {
    return this.http.get<NamespaceCheckResult>(
      `/api/namespace/check/${encodeURIComponent(namespace)}`,
    );
  }

  /**
   * Claim a namespace for the authenticated user.
   *
   * @param namespace - The namespace to claim
   */
  async claim(namespace: string): Promise<NamespaceInfo> {
    return this.http.post<NamespaceInfo>("/api/user/namespace", { namespace });
  }

  /**
   * Release the authenticated user's current namespace.
   */
  async release(): Promise<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>("/api/user/namespace");
  }
}
