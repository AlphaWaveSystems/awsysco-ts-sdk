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
 * Note: there is no `total` field — the platform does not return a total
 * count across all pages, only whether more pages exist (`hasMore`).
 */
export interface PaginatedResponse<T> {
  data: T[];
  limit: number;
  offset: number;
  hasMore: boolean;
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
  /** Short code (e.g. "abc123") */
  short: string;
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
}

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
  period: string;
  totalClicks: number;
  uniqueVisitors: number;
  clicksByDay: { date: string; clicks: number }[];
  countryBreakdown: Record<string, number>;
  tierLimit: number;
  tier: string;
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
  index: number;
  url: string;
  success: boolean;
  shortUrl?: string;
  shortCode?: string;
  error?: string;
}

export interface BulkCreateResult {
  created: number;
  failed: number;
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

// ─── Usage ───────────────────────────────────────────────────────────────────

export interface UsageLimits {
  linksPerMonth: number | 'unlimited';
  monthlyLinks: number | 'unlimited';
  dailyLinks: number | 'unlimited';
  monthlyTrackedClicks: number | 'unlimited';
  apiCallsPerMonth: number;
  qrCodes: number | 'unlimited';
  folders: number | 'unlimited';
  customSlugs: number;
}

export interface UsageOverage {
  active: boolean;
  startedAt: string | null;
  expiresAt: string | null;
  hoursUntilDrop: number | null;
  clicksThisCycle: number;
  spendingLimitCents: number;
  estimatedChargeCents: number;
}

/**
 * Live consumption stats for the authenticated user.
 *
 * Distinct from {@link Me} (`client.me.get()`), which returns the static
 * profile/plan limits — this returns the user's *current* consumption against
 * those limits (links/clicks/QR codes/API calls used this period, overage
 * state, etc.).
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
  short: string;
  long: string;
  score: number | null;
  status: 'safe' | 'suspicious' | 'malicious' | 'unknown' | null;
  threats?: string[];
  scannedAt?: string | null;
}

// ─── Namespace ───────────────────────────────────────────────────────────────

export interface NamespaceInfo {
  hasAccess: boolean;
  namespace: string | null;
  tier: string;
  upgradeRequired?: boolean;
}

export interface NamespaceCheckResult {
  namespace: string;
  available: boolean;
  reason: string | null;
  previewUrl: string | null;
}

// ─── UTM Templates ───────────────────────────────────────────────────────────

export interface UtmTemplate {
  id: string;
  name: string;
  source: string;
  medium: string;
  campaign: string;
  term?: string;
  content?: string;
}

export interface CreateUtmTemplateOptions {
  name: string;
  source: string;
  medium: string;
  campaign: string;
  term?: string;
  content?: string;
}

// ─── Webhooks ────────────────────────────────────────────────────────────────

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  name?: string;
  enabled: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  lastTriggered: string | null;
  failureCount?: number;
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
  status: 'pending_txt' | 'verified' | 'active' | 'inactive';
  verificationToken?: string;
  txtRecord?: { name: string; type: string; value: string };
  cnameRecord?: { name: string; type: string; value: string };
  isDefault?: boolean;
  linkCount?: number;
  createdAt?: string;
}

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
  short?: string;
  totalAgentClicks: number;
  agentClicks: AgentClickEntry[];
  periodDays: number;
}

// ─── Affiliate ───────────────────────────────────────────────────────────────

export interface AffiliateProgram {
  id: string;
  name: string;
  description?: string;
  commissionType: 'cpc' | 'cpa_return' | 'both';
  cpcRate?: number;
  cpaRate?: number;
  cookieDays?: number;
  status: string;
  createdAt?: string;
}

export interface CreateAffiliateProgramOptions {
  name: string;
  description?: string;
  commissionType: 'cpc' | 'cpa_return' | 'both';
  cpcRate?: number;
  cpaRate?: number;
  cookieDays?: number;
}

export interface AffiliatePartner {
  id: string;
  partnerId: string;
  email?: string;
  status: string;
  partnerCode?: string;
  joinedAt?: string;
}

export interface AffiliatePartnership {
  id: string;
  programId: string;
  programName?: string;
  partnerCode?: string;
  status: string;
  joinedAt?: string;
}
