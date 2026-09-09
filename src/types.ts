// ─── Client Configuration ───────────────────────────────────────────────────

export interface AwsysClientConfig {
  /** API key (e.g. `awsys_abc123...`) */
  apiKey: string;
  /**
   * Base URL of the AWSYS.CO API.
   * @default "https://awsys.co"
   */
  baseUrl?: string;
  /**
   * Maximum number of automatic retries on 429 responses, and on 502/503/504
   * or transport errors for idempotent methods (GET/PUT/DELETE).
   * @default 3
   */
  maxRetries?: number;
  /**
   * Per-request timeout in milliseconds, enforced via `AbortController`.
   * Overridable per call via `{ timeoutMs }` on individual resource methods
   * that accept request options.
   * @default 30000
   */
  timeoutMs?: number;
}

// ─── Pagination ──────────────────────────────────────────────────────────────

/**
 * The platform does not return a total count across all pages, only whether
 * more pages exist (`hasMore`) — `total` is kept only for backward
 * compatibility (ADR-014: minors never drop a public field) and is always
 * `undefined`. Use `hasMore` instead.
 */
export interface PaginatedResponse<T> {
  data: T[];
  limit: number;
  offset: number;
  hasMore: boolean;
  /** @deprecated Always `undefined` since 1.4.0 — the platform never returns a total. Use `hasMore`. */
  total?: number;
}

export interface PaginationParams {
  /** Maximum number of items to return */
  limit?: number;
  /** Number of items to skip */
  offset?: number;
}

// ─── Links ───────────────────────────────────────────────────────────────────

export interface RoutingRule {
  country: string;
  redirectUrl: string;
}

export interface OgMeta {
  title?: string;
  description?: string;
  image?: string;
}

export interface GeoRestriction {
  allowedCountries?: string[];
  blockedCountries?: string[];
}

export interface CreateLinkOptions {
  /** The destination URL to shorten */
  url: string;
  /** Optional custom slug (e.g. "my-link"). Requires Pro tier or higher. */
  customSlug?: string;
  /** ISO 8601 expiry date-time string */
  expiresAt?: string;
  /** Maximum number of clicks before the link expires */
  maxClicks?: number;
  /** URL to redirect to when the link expires (by date or click cap), instead of showing an error page */
  expireFallbackUrl?: string;
  /** Country-based routing rules */
  routingRules?: RoutingRule[];
  /** Open Graph metadata overrides */
  ogMeta?: OgMeta;
  /** Geographic access restrictions */
  geoRestriction?: GeoRestriction;
  /** Password-protect the link */
  password?: string;
  /** Pass ad click IDs (gclid, fbclid, etc.) through to the destination */
  passAdClickIds?: boolean;
  /** Folder ID to assign the link to */
  folderId?: string;
  /** Tags to attach to the link */
  tags?: string[];
}

export interface UpdateLinkOptions {
  /** Change the destination URL */
  url?: string;
  /** ISO 8601 expiry date-time string */
  expiresAt?: string;
  /** Maximum number of clicks before the link expires */
  maxClicks?: number;
  /** URL to redirect to when the link expires (by date or click cap), instead of showing an error page */
  expireFallbackUrl?: string;
  /** Country-based routing rules */
  routingRules?: RoutingRule[];
  /** Open Graph metadata overrides */
  ogMeta?: OgMeta;
  /** Geographic access restrictions */
  geoRestriction?: GeoRestriction;
  /** Password-protect the link */
  password?: string;
  /** Pass ad click IDs through to the destination */
  passAdClickIds?: boolean;
  /** Folder ID to assign the link to */
  folderId?: string;
  /** Tags to attach to the link */
  tags?: string[];
}

/**
 * Represents a shortened link as returned by the create endpoint.
 */
export interface CreatedLink {
  /** Whether the creation was successful */
  success: boolean;
  /** Full short URL (e.g. "https://awsys.co/abc123") */
  shortUrl: string;
  /** The short code (e.g. "abc123") */
  shortCode: string;
  /** The destination (long) URL */
  long: string;
  /** True if an existing link was returned instead of creating a new one */
  isExisting: boolean;
  /** ISO 8601 expiry timestamp, if set */
  expiresAt?: string;
  /** Maximum clicks limit, if set */
  maxClicks?: number;
  /** Whether the link has a password */
  hasPassword?: boolean;
}

/**
 * Represents a link as returned by list/get operations.
 */
export interface Link {
  /** Firestore document ID */
  id: string;
  /**
   * @deprecated never actually populated by the platform (neither
   * `GET`/`POST /api/v1/links` return it) — kept optional for compat
   * with pre-1.4.0 consumer code. Use `shortCode` instead. Was
   * incorrectly typed as required until live-verified (ADR-022).
   */
  short?: string;
  /** Full path, including namespace if applicable (e.g. "ns/slug") */
  fullPath: string;
  /** Full short URL */
  shortUrl?: string;
  /** Short code (alias) */
  shortCode?: string;
  /** Namespace, if applicable */
  namespace?: string | null;
  /** The destination URL */
  long: string;
  /** Click count */
  clicks: number;
  /** ISO 8601 creation timestamp */
  created: string | null;
  /** ISO 8601 expiry timestamp */
  expiresAt: string | null;
  /** Maximum clicks limit */
  maxClicks: number | null;
  /** URL to redirect to when the link expires, instead of showing an error page */
  expireFallbackUrl?: string | null;
  /** Whether this is a custom slug link */
  isCustom: boolean;
  /** Folder ID if assigned */
  folderId?: string | null;
  /** Tags */
  tags?: string[];
  /** Geographic access restrictions, if configured — verified live. */
  geoRestriction?: GeoRestriction | null;
  /** Country-based routing rules, if configured — verified live. */
  routingRules?: RoutingRule[] | null;
  /** Open Graph metadata overrides, if configured — verified live. */
  ogMeta?: OgMeta | null;
  /** Whether the link has been manually disabled — verified live. */
  isDisabled?: boolean;
  /** Reason the link was disabled, if applicable — verified live. */
  disabledReason?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- kept as an interface (not a type alias) by design so it stays open to extension without a breaking change; currently identical to its supertype.
export interface ListLinksOptions extends PaginationParams {}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface ClickEvent {
  timestamp: string | null;
  country: string | null;
  device: string | null;
  userAgent: string | null;
}

/**
 * A single entry returned by `client.analytics.getRecentClicks()`.
 */
export interface RecentClickEntry {
  shortCode: string;
  timestamp: string | null;
  country: string | null;
}

export interface GetRecentClicksOptions {
  /** Maximum number of recent click events to return */
  limit?: number;
  /** ISO 8601 timestamp; only return clicks after this time */
  since?: string;
}

/**
 * Response shape for `GET /api/user/clicks/recent`.
 */
export interface RecentClicksResult {
  clicks: RecentClickEntry[];
  count: number;
}

/**
 * Compact per-link breakdown nested inside {@link LinkStats}.
 */
export interface AggregateStats {
  countries: Record<string, number>;
  devices: Record<string, number>;
  browsers: Record<string, number>;
  referrers: Record<string, number>;
}

export interface LinkStats {
  shortCode: string;
  fullPath: string | null;
  totalClicks: number;
  clicks: ClickEvent[];
  aggregateStats?: AggregateStats;
}

/**
 * Rich aggregated analytics for a single link, returned by
 * `client.analytics.getAggregateStats()`
 * (`GET /api/v1/links/:shortPath/stats/aggregate`).
 *
 * The free tier returns `countryBreakdown` plus `upgradeForMore`; the paid-tier
 * breakdown fields (device/referrer/browser/os/hour/source/utm) are present only
 * for plans that include the corresponding analytics dimension.
 */
export interface AggregateAnalytics {
  shortCode: string;
  fullPath: string | null;
  totalClicks: number;
  countryBreakdown: Record<string, number>;
  clicksByDay: { date: string; clicks: number }[];
  /** Not present on every response (e.g. free-tier) — verified live against staging. */
  period?: string;
  botClicksExcluded?: boolean;
  uniqueVisitors?: number;
  tierLimit?: number;
  tier?: string;
  deviceBreakdown?: { mobile: number; desktop: number; tablet: number };
  referrerBreakdown?: Record<string, number>;
  browserBreakdown?: Record<string, number>;
  osBreakdown?: Record<string, number>;
  hourBreakdown?: { hour: number; clicks: number }[];
  sourceBreakdown?: Record<string, number>;
  utmBreakdown?: {
    sources: Record<string, number>;
    mediums: Record<string, number>;
    campaigns: Record<string, number>;
  };
  upgradeForMore?: { available: string[]; message: string };
}

// ─── QR Codes ────────────────────────────────────────────────────────────────

export interface QRCodeOptions {
  /** Image size in pixels (width = height) */
  size?: number;
  /** Foreground color as hex string (without #) */
  color?: string;
  /** Background color as hex string (without #) */
  bgColor?: string;
}

export interface QRSettings {
  size?: number;
  color?: string;
  bgColor?: string;
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  logoUrl?: string;
}

// ─── Folders ─────────────────────────────────────────────────────────────────

export interface CreateFolderOptions {
  name: string;
  /** Hex color string (without #), e.g. "ff5733" */
  color?: string;
}

export interface UpdateFolderOptions {
  name?: string;
  color?: string;
}

export interface Folder {
  id: string;
  name: string;
  color?: string | null;
  linkCount?: number;
  createdAt?: string | null;
}

// ─── Bulk ────────────────────────────────────────────────────────────────────

export interface BulkCreateOptions {
  urls: Array<{
    url: string;
    customSlug?: string;
    expiresAt?: string;
    maxClicks?: number;
  }>;
}

export interface BulkLinkResult {
  url: string;
  success: boolean;
  shortUrl?: string;
  shortCode?: string;
  error?: string;
}

/** `created`/`failed`/`total` live under `summary` on the wire — not top-level. */
export interface BulkCreateSummary {
  total: number;
  created: number;
  failed: number;
}

export interface BulkCreateResult {
  success: boolean;
  summary: BulkCreateSummary;
  results: BulkLinkResult[];
}

// ─── Me ──────────────────────────────────────────────────────────────────────

export interface MeFeatures {
  apiAccess: boolean;
  customSlugs: boolean;
  brandedNamespace: boolean;
  webhooks: boolean;
  bulkUpload: boolean;
  analyticsRetentionDays: number;
}

export interface MeLimits {
  apiCallsPerMonth: number | null;
  dailyLinks: number | null;
}

export interface Me {
  uid: string;
  email: string;
  subscriptionTier: string;
  userPrefix?: string | null;
  isPremium?: boolean;
  features?: MeFeatures;
  limits?: MeLimits;
}

// ─── Profile ─────────────────────────────────────────────────────────────────

/**
 * The authenticated user's editable profile, returned by
 * `client.profile.get()`/`client.profile.update()`. Distinct from
 * {@link Me} (static plan/feature info) and {@link UsageStats} (live
 * consumption).
 */
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string | null;
  subscriptionTier?: string;
}

export interface UpdateProfileOptions {
  displayName?: string;
}

/**
 * Response from `client.profile.update()` — distinct from {@link UserProfile}
 * (`client.profile.get()`'s return type), since the update response does
 * NOT echo back `uid`/`email` — verified against contract fixture 1.0.9.
 */
export interface UpdateProfileResult {
  success: boolean;
  displayName?: string | null;
}

// ─── Usage ───────────────────────────────────────────────────────────────────

export interface UsageLimits {
  linksPerMonth: number | 'unlimited';
  monthlyLinks: number | 'unlimited';
  dailyLinks: number | 'unlimited';
  monthlyTrackedClicks: number | 'unlimited';
  apiCallsPerMonth: number;
  qrCodes: number | 'unlimited';
  folders: number | 'unlimited';
  /** A feature flag on some tiers, a count on others — platform-defined. */
  customSlugs: number | boolean;
}

export interface UsageOverage {
  active: boolean;
  startedAt: string | null;
  expiresAt: string | null;
  hoursUntilDrop: number | null;
  clicksThisCycle: number;
  spendingLimitCents: number | null;
  estimatedChargeCents: number;
}

/**
 * Live consumption stats for the authenticated user.
 *
 * Distinct from {@link Me} (`client.me.get()`), which returns the static
 * profile/plan limits — this returns the user's *current* consumption against
 * those limits (links/clicks/QR codes/API calls used this period, overage
 * state, etc.).
 *
 * Verified against the live `GET /api/user/stats` response (contract fixture
 * 1.0.6, "usage" scenario) — every field below is a real, always-present wire
 * field mapped 1:1 by name.
 */
export interface UsageStats {
  totalLinks: number;
  totalClicks: number;
  linksCreatedThisMonth: number;
  qrCodesThisMonth: number;
  folderCount: number;
  apiCallsThisMonth: number;
  trackedClicksThisMonth: number;
  tier: string;
  limits: UsageLimits;
  hasApiKey: boolean;
  apiKeyCreatedAt: string | null;
  userPrefix: string | null;
  isPremium: boolean;
  overage: UsageOverage;
  /**
   * @deprecated legacy field from an earlier (incorrect) understanding of
   * this endpoint's shape — not present on the real response. Kept optional
   * for source compatibility with pre-1.4.0 consumer code; will be removed
   * in the next major.
   */
  linksCreatedToday?: number;
  /** @deprecated see `linksCreatedToday` — not present on the real response. */
  linksToday?: number;
  /** @deprecated see `linksCreatedToday` — not present on the real response. */
  dailyLimit?: number;
  /** @deprecated see `linksCreatedToday` — not present on the real response. */
  apiMonthlyLimit?: number;
}

// ─── Web2App ─────────────────────────────────────────────────────────────────

export interface Web2AppSession {
  success: boolean;
  linkId: string;
  utmParams: Record<string, string>;
  routingRule: Record<string, unknown> | null;
  country: string | null;
  clickedAt: string | null;
}

// ─── Imports ─────────────────────────────────────────────────────────────────

/**
 * An import job that migrates links from an external provider (e.g. Bitly) into
 * AWSYS.CO. Returned by all `client.imports.*` methods.
 *
 * `status` progresses through provider-specific intermediate states and settles
 * on one of the terminal states: `completed`, `partial`, `failed`, `cancelled`.
 */
export interface ImportJob {
  id: string;
  userId: string;
  provider: string;
  status: string;
  scanOnly: boolean;
  targetNamespace: string | null;
  scopeFilter: string | null;
  counts: {
    fetched: number;
    transformed: number;
    written: number;
    errored: number;
  };
  errors: string[];
  createdAt: string | null;
  updatedAt: string | null;
}

/**
 * A single old-URL → new-URL mapping entry in an import job's redirect map,
 * returned by `client.imports.getRedirectMapJson()`.
 */
export interface ImportRedirectMapEntry {
  from: string;
  to: string;
}

/**
 * Response shape for `GET /api/v1/imports/:jobId/redirect-map.json`.
 */
export interface ImportRedirectMap {
  mappings: ImportRedirectMapEntry[];
}

// ─── Tags ────────────────────────────────────────────────────────────────────

export interface TagsResult {
  success: boolean;
  tags: string[];
}

// ─── Trust Score ─────────────────────────────────────────────────────────────

export interface TrustScoreResult {
  /**
   * The real wire field (verified live — `short`, not `shortCode`; a prior
   * fix had this backwards, ADR-022).
   */
  short: string;
  /** @deprecated the platform never actually returns `shortCode` here — kept optional for compat, mapped from `short`. */
  shortCode?: string;
  /** @deprecated not present on the actual response. */
  long?: string;
  /** @deprecated prefer `trustScore` — kept for compat, mapped from it. */
  score: number | null;
  trustScore: number | null;
  /** @deprecated prefer `trustStatus` — kept for compat, mapped from it. */
  status: string | null;
  /**
   * A broad `string` rather than a narrow union — the platform's own docs
   * disagree with each other (`"safe"/"warning"/"unsafe"` vs. an observed
   * live value of `"trusted"`), so the full value set isn't confirmed.
   */
  trustStatus: string | null;
  threats: string[];
  scannedAt?: string | null;
  /** The scan's source/provider, e.g. `"gsb+heuristics"` — verified live. */
  source?: string;
  /** Epoch-milliseconds on the wire, normalized to an ISO string — verified live. */
  createdAt?: string | null;
}

// ─── Namespace ───────────────────────────────────────────────────────────────

export interface NamespaceInfo {
  hasAccess: boolean;
  namespace: string | null;
  tier: string;
  /** @deprecated not present on the real response — kept optional for compat. */
  upgradeRequired?: boolean;
  namespaceData?: {
    userEmail?: string;
    isActive?: boolean;
    tier?: string;
    userId?: string;
    claimedAt?: string | null;
  };
  canClaimSubdomain?: boolean;
  canClaimCustomDomain?: boolean;
}

export interface NamespaceCheckResult {
  namespace: string;
  available: boolean;
  /** Not present on every response — verified against contract fixture 1.0.9. */
  reason?: string | null;
  previewUrl?: string | null;
}

// ─── UTM Templates ───────────────────────────────────────────────────────────

export interface UtmTemplate {
  id: string;
  name: string;
  /** The platform's own field name (contract fixture 1.0.9) — was previously, incorrectly, thought to be `utmSource`. */
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
  /** @deprecated legacy alias for `source` — never the platform's actual field name. Kept for compat (ADR-014), mapped from `source`. */
  utmSource?: string;
  /** @deprecated legacy alias for `medium`. */
  utmMedium?: string;
  /** @deprecated legacy alias for `campaign`. */
  utmCampaign?: string;
}

export interface CreateUtmTemplateOptions {
  name: string;
  /** The platform reads `source` (contract fixture 1.0.9) — `source`/`medium`/`campaign` take precedence over the deprecated `utmSource`/`utmMedium`/`utmCampaign` aliases below when both are set. */
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
  /** @deprecated legacy alias for `source` — the platform does NOT read `utmSource`; this was a prior (incorrect) belief. Kept for compat (ADR-014). */
  utmSource?: string;
  /** @deprecated legacy alias for `medium`. */
  utmMedium?: string;
  /** @deprecated legacy alias for `campaign`. */
  utmCampaign?: string;
}

// ─── Webhooks ────────────────────────────────────────────────────────────────

/**
 * `serializeWebhook` on the platform spreads the stored doc as-is
 * (services/webhooks.js:82) — legacy webhook docs seen live on staging lack
 * `enabled`/`secret` entirely, so every field except `id`/`url`/`events` is
 * optional here. `enabled` must never be assumed `true` when absent.
 */
export interface Webhook {
  id: string;
  url: string;
  events: string[];
  name?: string;
  /** Wire field is `enabled` (services/webhooks.js:122,150), never `active`. Absent on legacy docs — do not default to `true`. */
  enabled?: boolean;
  secret?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  lastTriggered?: string | null;
  failureCount?: number;
  successCount?: number;
}

export interface WebhookEventType {
  name: string;
  description: string;
}

export interface CreateWebhookOptions {
  url: string;
  events: string[];
  name?: string;
  secret?: string;
}

export interface UpdateWebhookOptions {
  url?: string;
  events?: string[];
  name?: string;
  secret?: string;
  enabled?: boolean;
}

// ─── Saved Views ─────────────────────────────────────────────────────────────

export interface SavedViewFilters {
  folderId?: string;
  tag?: string;
  status?: string;
  search?: string;
  dateRange?: string;
}

export interface SavedView {
  id: string;
  name: string;
  filters: SavedViewFilters;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSavedViewOptions {
  name: string;
  filters: SavedViewFilters;
}

export interface UpdateSavedViewOptions {
  name?: string;
  filters?: SavedViewFilters;
}

// ─── Custom Domains ──────────────────────────────────────────────────────────

export interface CustomDomain {
  domain: string;
  /**
   * Not present on every response (`update()`'s response omits it
   * entirely). Kept as a broad `string` rather than a narrow union since
   * the full set of real values isn't confirmed (observed live:
   * `"pending_txt"`, `"inactive"`).
   */
  status?: string;
  /** @deprecated not present on the real response — see `verifiedAt`. */
  verified?: boolean;
  verificationToken?: string;
  txtRecord?: { name: string; type: string; value: string };
  cnameRecord?: { name: string; type: string; value: string };
  isDefault?: boolean;
  linkCount?: number;
  createdAt?: string;
  updatedAt?: string;
  verifiedAt?: string | null;
  userId?: string;
  type?: string;
  sslStatus?: string;
  sslCertExpiresAt?: string | null;
  stripeSubscriptionItemId?: string | null;
  billingStartDate?: string | null;
  lastError?: string | null;
  defaultRedirect?: string;
  notFoundHtml?: string;
}

/**
 * `client.customDomains.add()`'s return type — verified live against
 * staging and `domains.js:51-55`. A prior fix mistakenly replaced this
 * with a `dnsRecords[]` array that doesn't exist on the wire; reverted
 * (ADR-022).
 */
export interface AddDomainResult {
  domain: string;
  status: string;
  verificationToken: string;
  txtRecord: { name: string; type: string; value: string };
  cnameRecord: { name: string; type: string; value: string };
}

// ─── Agentlink ───────────────────────────────────────────────────────────────

export interface AgentClickEntry {
  agent: string;
  count: number;
}

export interface AgentLinkStats {
  shortCode?: string;
  /** @deprecated wire field is `shortCode`. */
  short?: string;
  agentClicks: number;
  clicks?: AgentClickEntry[];
  byAgent?: Record<string, number>;
  /** @deprecated the wire response does not include a separate total distinct from `agentClicks`. */
  totalAgentClicks?: number;
  periodDays?: number;
}

// ─── Affiliate ───────────────────────────────────────────────────────────────

/**
 * `client.affiliate.getLimits()`'s return type — verified live against
 * staging and `affiliate.js:184-197`. A prior fix mistakenly replaced this
 * whole shape with just its `usage` sub-object; reverted (ADR-022).
 */
export interface AffiliateLimits {
  tier: string;
  limits: {
    canCreatePrograms: boolean;
    maxPrograms: number;
    maxPartnersPerProgram: number;
    canJoinAsPartner: boolean;
    maxPartnerships: number;
  };
  usage: {
    programs: number;
    partnerships: number;
  };
}

export interface AffiliateProgram {
  id: string;
  name: string;
  description?: string;
  // `commissionType`/`status` were previously (incorrectly) marked optional
  // based on a bad contract fixture — live staging shows both present on
  // every list()/get() entry, so reverted to required.
  commissionType: 'cpc' | 'cpa_return' | 'both';
  cpcRate?: number;
  cpaRate?: number;
  /** The real wire field name — verified live (was previously, incorrectly, `cookieDays`). */
  cookieDurationDays?: number;
  status: string;
  merchantId?: string;
  maxPartners?: number;
  partnerCount?: number;
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAffiliateProgramOptions {
  name: string;
  description?: string;
  /** @deprecated the platform accepts a single `commissionRate` — kept optional for compat. */
  commissionType?: 'cpc' | 'cpa_return' | 'both';
  cpcRate?: number;
  cpaRate?: number;
  commissionRate?: number;
  cookieDays?: number;
}

export interface AffiliatePartner {
  id: string;
  /** Not present on every response (list/updateStatus omit it) — verified against contract fixture 1.0.7. */
  partnerId?: string;
  email?: string;
  status: string;
  partnerCode?: string;
  joinedAt?: string;
}

export interface AffiliatePartnership {
  id: string;
  programId: string;
  /** @deprecated not present on the real response — kept optional for compat. */
  programName?: string;
  partnerCode?: string;
  status: string;
  /** @deprecated not present on the real response — see `createdAt`. */
  joinedAt?: string;
  partnerId?: string;
  partnerEmail?: string;
  stats?: {
    totalClicks: number;
    uniqueClicks: number;
    conversions: number;
    pendingEarnings: number;
    paidEarnings: number;
  };
  program?: {
    id: string;
    name: string;
    commissionType?: string;
    cpcRate?: number;
    cpaRate?: number;
    status?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}
