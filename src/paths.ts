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
  customDomains: {
    base: "/api/user/domains",
    byDomain: (domain: string): string => `/api/user/domains/${encodeSegment(domain)}`,
    verify: (domain: string): string =>
      `/api/user/domains/${encodeSegment(domain)}/verify`,
    activate: (domain: string): string =>
      `/api/user/domains/${encodeSegment(domain)}/activate`,
    check: (hostname: string): string => `/api/domains/check/${encodeSegment(hostname)}`,
  },
  imports: {
    base: "/api/v1/imports",
    byId: (jobId: string): string => `/api/v1/imports/${encodeSegment(jobId)}`,
    redirectMapCsv: (jobId: string): string =>
      `/api/v1/imports/${encodeSegment(jobId)}/redirect-map.csv`,
    redirectMapJson: (jobId: string): string =>
      `/api/v1/imports/${encodeSegment(jobId)}/redirect-map.json`,
  },
  tags: {
    forLink: (shortPath: string): string => `/api/link/${encodeSegment(shortPath)}/tags`,
    byTag: (shortPath: string, tag: string): string =>
      `/api/link/${encodeSegment(shortPath)}/tags/${encodeSegment(tag)}`,
  },
  utmTemplates: {
    /** No dedicated list route exists — list is derived from `/api/v1/me` (ADR-003). */
    viaMe: "/api/v1/me",
    create: "/api/user/utm-templates",
    byId: (id: string): string => `/api/user/utm-templates/${encodeSegment(id)}`,
  },
  webhooks: {
    /**
     * `/api/v1/webhooks/*` is preferred over `/api/webhooks/*` where both
     * exist (both accept API keys) — but not every action has a v1 twin.
     * list/create/delete/test are versioned; update and event-types are not
     * (verified against the contract fixture, which is authoritative here).
     */
    eventTypes: "/api/webhooks/event-types",
    base: "/api/v1/webhooks",
    byId: (webhookId: string): string => `/api/v1/webhooks/${encodeSegment(webhookId)}`,
    /** Unversioned — no v1 twin for update. */
    byIdForUpdate: (webhookId: string): string => `/api/webhooks/${encodeSegment(webhookId)}`,
    test: (webhookId: string): string => `/api/v1/webhooks/${encodeSegment(webhookId)}/test`,
  },
};
