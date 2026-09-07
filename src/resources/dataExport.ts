import type { HttpClient, RequestOptions } from "../http.js";
import { paths } from "../paths.js";

export class DataExportResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Export all links for the authenticated user as a CSV string.
   *
   * @returns Raw CSV text
   */
  async exportLinks(options?: RequestOptions): Promise<string> {
    return this.http.getText(paths.dataExport.links, undefined, options);
  }

  /**
   * Export click statistics for a specific link as a CSV string.
   *
   * @param shortPath - The short code or namespaced path
   * @returns Raw CSV text
   */
  async exportLinkStats(shortPath: string, options?: RequestOptions): Promise<string> {
    return this.http.getText(paths.dataExport.linkStats(shortPath), undefined, options);
  }
}
