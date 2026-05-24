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
   * Maximum number of automatic retries on 429 responses.
   * @default 3
   */
  maxRetries?: number;
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

export interface PaginationParams {
  /** Maximum number of items to return */
  limit?: number;
  /** Number of items to skip */
  offset?: number;
}

// ─── Links ───────────────────────────────────────────────────────────────────

export interface CreateLinkOptions {
  /** The destination URL to shorten */
  url: string;
  /** Optional custom slug (e.g. "my-link"). Requires Pro tier or higher. */
  customSlug?: string;
  /** ISO 8601 expiry date-time string */
  expiresAt?: string;
  /** Maximum number of clicks before the link expires */
  maxClicks?: number;
}

export interface UpdateLinkOptions {
  /** ISO 8601 expiry date-time string */
  expiresAt?: string;
  /** Maximum number of clicks before the link expires */
  maxClicks?: number;
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
  /** Whether this is a custom slug link */
  isCustom: boolean;
  /** Folder ID if assigned */
  folderId?: string | null;
}

export interface ListLinksOptions extends PaginationParams {}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface ClickEvent {
  timestamp: string | null;
  country: string | null;
  device: string | null;
  userAgent: string | null;
}

export interface LinkStats {
  shortCode: string;
  fullPath: string | null;
  totalClicks: number;
  clicks: ClickEvent[];
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

// ─── Folders ─────────────────────────────────────────────────────────────────

export interface CreateFolderOptions {
  name: string;
  /** Hex color string (without #), e.g. "ff5733" */
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
