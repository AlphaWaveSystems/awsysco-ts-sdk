import { HttpClient } from "./http.js";
import { AnalyticsResource } from "./resources/analytics.js";
import { BulkResource } from "./resources/bulk.js";
import { FoldersResource } from "./resources/folders.js";
import { LinksResource } from "./resources/links.js";
import { MeResource } from "./resources/me.js";
import { QRResource } from "./resources/qr.js";
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
  /** Analytics resource — get click stats */
  readonly analytics: AnalyticsResource;
  /** QR code URL builder */
  readonly qr: QRResource;
  /** Folders resource — organize links */
  readonly folders: FoldersResource;
  /** Bulk operations — create multiple links at once */
  readonly bulk: BulkResource;
  /** Me resource — current user info */
  readonly me: MeResource;

  constructor(config: AwsysClientConfig) {
    if (!config.apiKey) {
      throw new Error("AwsysClient: apiKey is required");
    }

    const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    const http = new HttpClient(config.apiKey, baseUrl, config.maxRetries);

    this.links = new LinksResource(http);
    this.analytics = new AnalyticsResource(http);
    this.qr = new QRResource(baseUrl);
    this.folders = new FoldersResource(http);
    this.bulk = new BulkResource(http);
    this.me = new MeResource(http);
  }
}
