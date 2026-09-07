import type { HttpClient, RequestOptions } from "../http.js";
import { paths } from "../paths.js";
import type { BulkCreateOptions, BulkCreateResult } from "../types.js";

export class BulkResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create multiple shortened links in a single request.
   *
   * Requires Builder tier or higher.
   *
   * @param opts - Bulk creation options including array of URLs
   * @returns Results for each URL in the request
   */
  async create(opts: BulkCreateOptions, options?: RequestOptions): Promise<BulkCreateResult> {
    return this.http.post<BulkCreateResult>(paths.bulk.base, opts, options);
  }
}
