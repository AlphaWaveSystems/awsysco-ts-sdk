// Client
export { AwsysClient, DEFAULT_BASE_URL } from "./client.js";

// Errors
export {
  AwsysAuthError,
  AwsysConflictError,
  AwsysError,
  AwsysForbiddenError,
  AwsysNotFoundError,
  AwsysRateLimitError,
  AwsysValidationError,
} from "./errors.js";

// Resource classes
export { AffiliateResource } from "./resources/affiliate.js";
export { AgentlinkResource } from "./resources/agentlink.js";
export { AnalyticsResource } from "./resources/analytics.js";
export { BulkResource } from "./resources/bulk.js";
export { CustomDomainsResource } from "./resources/customDomains.js";
export { DataExportResource } from "./resources/dataExport.js";
export { FoldersResource } from "./resources/folders.js";
export { ImportsResource } from "./resources/imports.js";
export { LinksResource } from "./resources/links.js";
export { MeResource } from "./resources/me.js";
export { NamespaceResource } from "./resources/namespace.js";
export { QRResource } from "./resources/qr.js";
export { SavedViewsResource } from "./resources/savedViews.js";
export { TagsResource } from "./resources/tags.js";
export { TrustScoreResource } from "./resources/trustScore.js";
export { UsageResource } from "./resources/usage.js";
export { UtmTemplatesResource } from "./resources/utmTemplates.js";
export { Web2AppResource } from "./resources/web2app.js";
export { WebhooksResource } from "./resources/webhooks.js";

// Resource option types
export type {
  StartImportOptions,
  WaitForCompletionOptions,
} from "./resources/imports.js";

// Types
export type {
  AddDomainResult,
  AffiliatePartner,
  AffiliatePartnership,
  AffiliateProgram,
  AgentClickEntry,
  AgentLinkStats,
  AggregateStats,
  AwsysClientConfig,
  BulkCreateOptions,
  BulkCreateResult,
  BulkLinkResult,
  ClickEvent,
  CreateAffiliateProgramOptions,
  CreateFolderOptions,
  CreateLinkOptions,
  CreateSavedViewOptions,
  CreateUtmTemplateOptions,
  CreateWebhookOptions,
  CreatedLink,
  CustomDomain,
  Folder,
  GeoRestriction,
  ImportJob,
  Link,
  LinkAggregateStats,
  LinkStats,
  ListLinksOptions,
  Me,
  MeFeatures,
  MeLimits,
  NamespaceCheckResult,
  NamespaceInfo,
  OgMeta,
  PaginatedResponse,
  PaginationParams,
  QRCodeOptions,
  QRSettings,
  RoutingRule,
  SavedView,
  SavedViewFilters,
  TagsResult,
  TrustScoreResult,
  UpdateFolderOptions,
  UpdateLinkOptions,
  UpdateSavedViewOptions,
  UpdateWebhookOptions,
  UsageLimits,
  UsageOverage,
  UsageStats,
  UtmTemplate,
  Web2AppSession,
  Webhook,
  WebhookEventType,
} from "./types.js";
