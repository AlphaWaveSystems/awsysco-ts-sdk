import { HttpClient } from "./http.js";
import { AffiliateResource } from "./resources/affiliate.js";
import { AgentlinkResource } from "./resources/agentlink.js";
import { AnalyticsResource } from "./resources/analytics.js";
import { BulkResource } from "./resources/bulk.js";
import { CustomDomainsResource } from "./resources/customDomains.js";
import { DataExportResource } from "./resources/dataExport.js";
import { FoldersResource } from "./resources/folders.js";
import { ImportsResource } from "./resources/imports.js";
import { LinksResource } from "./resources/links.js";
import { MeResource } from "./resources/me.js";
import { NamespaceResource } from "./resources/namespace.js";
import { QRResource } from "./resources/qr.js";
import { SavedViewsResource } from "./resources/savedViews.js";
import { TagsResource } from "./resources/tags.js";
import { TrustScoreResource } from "./resources/trustScore.js";
import { UsageResource } from "./resources/usage.js";
import { UtmTemplatesResource } from "./resources/utmTemplates.js";
import { Web2AppResource } from "./resources/web2app.js";
import { WebhooksResource } from "./resources/webhooks.js";
import type { AwsysClientConfig } from "./types.js";

export const DEFAULT_BASE_URL = "https://awsys.co";

/**
 * The main entry point for the AWSYS.CO SDK.
 *
 * @example
 * ```typescript
 * import { AwsysClient } from "@awsysco/sdk";
 *
 * const client = new AwsysClient({ apiKey: "awsys_your_key_here" });
 *
 * const link = await client.links.create({ url: "https://example.com" });
 * console.log(link.shortUrl);
 * ```
 */
export class AwsysClient {
  /** Links resource — create, list, get, update, delete */
  readonly links: LinksResource;
  /** Analytics resource — get click stats and recent clicks */
  readonly analytics: AnalyticsResource;
  /** QR code URL builder and settings CRUD */
  readonly qr: QRResource;
  /** Folders resource — organize links */
  readonly folders: FoldersResource;
  /** Bulk operations — create multiple links at once */
  readonly bulk: BulkResource;
  /** Me resource — current user info */
  readonly me: MeResource;
  /** Tags resource — add and remove tags on links */
  readonly tags: TagsResource;
  /** Trust score resource — scan links for safety */
  readonly trustScore: TrustScoreResource;
  /** Data export resource — export links and stats as CSV */
  readonly dataExport: DataExportResource;
  /** Namespace resource — manage branded namespace */
  readonly namespace: NamespaceResource;
  /** UTM templates resource — manage UTM parameter templates */
  readonly utmTemplates: UtmTemplatesResource;
  /** Webhooks resource — manage webhooks and event subscriptions */
  readonly webhooks: WebhooksResource;
  /** Saved views resource — manage saved link filter views */
  readonly savedViews: SavedViewsResource;
  /** Custom domains resource — manage custom short domains */
  readonly customDomains: CustomDomainsResource;
  /** AgentLink resource — AI agent click analytics */
  readonly agentlink: AgentlinkResource;
  /** Affiliate resource — manage affiliate programs and partnerships */
  readonly affiliate: AffiliateResource;
  /** Usage resource — live consumption stats against plan limits */
  readonly usage: UsageResource;
  /** Web2App resource — consume web-to-app deferred deep-link sessions */
  readonly web2app: Web2AppResource;
  /** Imports resource — migrate links from external providers (e.g. Bitly) */
  readonly imports: ImportsResource;

  constructor(config: AwsysClientConfig) {
    if (!config.apiKey) {
      throw new Error("AwsysClient: apiKey is required");
    }

    const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    const http = new HttpClient(config.apiKey, baseUrl, config.maxRetries);

    this.links = new LinksResource(http);
    this.analytics = new AnalyticsResource(http);
    this.qr = new QRResource(baseUrl, http);
    this.folders = new FoldersResource(http);
    this.bulk = new BulkResource(http);
    this.me = new MeResource(http);
    this.tags = new TagsResource(http);
    this.trustScore = new TrustScoreResource(http);
    this.dataExport = new DataExportResource(http);
    this.namespace = new NamespaceResource(http);
    this.utmTemplates = new UtmTemplatesResource(http);
    this.webhooks = new WebhooksResource(http);
    this.savedViews = new SavedViewsResource(http);
    this.customDomains = new CustomDomainsResource(http);
    this.agentlink = new AgentlinkResource(http);
    this.affiliate = new AffiliateResource(http);
    this.usage = new UsageResource(http);
    this.web2app = new Web2AppResource(http);
    this.imports = new ImportsResource(http);
  }
}
