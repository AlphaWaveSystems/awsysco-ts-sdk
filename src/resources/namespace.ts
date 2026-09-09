import type { HttpClient, RequestOptions } from "../http.js";
import { paths } from "../paths.js";
import { parseTimestamp } from "../timestamps.js";
import type { NamespaceCheckResult, NamespaceInfo } from "../types.js";

function mapNamespaceInfo(raw: NamespaceInfo): NamespaceInfo {
  if (!raw.namespaceData?.claimedAt) return raw;
  return {
    ...raw,
    namespaceData: {
      ...raw.namespaceData,
      claimedAt: parseTimestamp(raw.namespaceData.claimedAt) as string | null,
    },
  };
}

export class NamespaceResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get the authenticated user's current namespace info.
   */
  async get(options?: RequestOptions): Promise<NamespaceInfo> {
    const raw = await this.http.get<NamespaceInfo>(paths.namespace.base, undefined, options);
    return mapNamespaceInfo(raw);
  }

  /**
   * Check whether a namespace is available to claim.
   *
   * @param namespace - The namespace string to check
   */
  async check(
    namespace: string,
    options?: RequestOptions,
  ): Promise<NamespaceCheckResult> {
    return this.http.get<NamespaceCheckResult>(
      paths.namespace.check(namespace),
      undefined,
      options,
    );
  }

  /**
   * Claim a namespace for the authenticated user.
   *
   * @param namespace - The namespace to claim
   */
  async claim(namespace: string, options?: RequestOptions): Promise<NamespaceInfo> {
    const raw = await this.http.post<NamespaceInfo>(
      paths.namespace.base,
      { namespace },
      options,
    );
    return mapNamespaceInfo(raw);
  }

  /**
   * Release the authenticated user's current namespace.
   */
  async release(options?: RequestOptions): Promise<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(paths.namespace.base, options);
  }
}
