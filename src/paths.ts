/**
 * Centralized route-path templates. Resources build request paths through
 * this module rather than inlining string literals, so a platform route
 * change (e.g. ADR-011's folder-update path) is a one-line fix.
 */

function encodeSegment(segment: string): string {
  return encodeURIComponent(segment);
}

/**
 * Encodes each "/"-separated part of a namespaced short path individually,
 * preserving the literal "/" between them. Required for GET/DELETE wildcard
 * routes, which match an unencoded slash (see contract note on
 * `get_link_namespaced`).
 */
function encodePreservingSlash(shortPath: string): string {
  return shortPath.split("/").map(encodeSegment).join("/");
}

export const paths = {
  links: {
    base: "/api/v1/links",
    byShortPath: (shortPath: string): string =>
      `/api/v1/links/${encodePreservingSlash(shortPath)}`,
    /**
     * PATCH cannot address a namespaced link unless the slash is encoded
     * (ADR-009 — the platform's PATCH route has no wildcard matcher).
     */
    byShortPathForUpdate: (shortPath: string): string =>
      `/api/v1/links/${encodeSegment(shortPath)}`,
    folder: (shortPath: string): string =>
      `/api/v1/links/${encodePreservingSlash(shortPath)}/folder`,
    stats: (shortPath: string): string =>
      `/api/v1/links/${encodePreservingSlash(shortPath)}/stats`,
    aggregateStats: (shortPath: string): string =>
      `/api/v1/links/${encodePreservingSlash(shortPath)}/stats/aggregate`,
  },
  folders: {
    base: "/api/v1/folders",
    byId: (folderId: string): string =>
      `/api/v1/folders/${encodeSegment(folderId)}`,
    /** Unversioned route — the v1 PATCH route 404s on the platform (ADR-011). */
    byIdForUpdate: (folderId: string): string =>
      `/api/folders/${encodeSegment(folderId)}`,
  },
  analytics: {
    recentClicks: "/api/user/clicks/recent",
  },
  profile: {
    base: "/api/user/profile",
  },
  imports: {
    base: "/api/v1/imports",
    byId: (jobId: string): string => `/api/v1/imports/${encodeSegment(jobId)}`,
    redirectMapCsv: (jobId: string): string =>
      `/api/v1/imports/${encodeSegment(jobId)}/redirect-map.csv`,
    redirectMapJson: (jobId: string): string =>
      `/api/v1/imports/${encodeSegment(jobId)}/redirect-map.json`,
  },
};
