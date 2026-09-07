import type { HttpClient } from "../http.js";
import { paths } from "../paths.js";
import type {
  CreateLinkOptions,
  CreatedLink,
  Link,
  ListLinksOptions,
  PaginatedResponse,
  UpdateLinkOptions,
} from "../types.js";

const MAX_LIST_LIMIT = 100;

interface RawListResponse {
  links?: Link[];
  data?: Link[];
  pagination?: {
    limit?: number;
    offset?: number;
    hasMore?: boolean;
  };
}

export class LinksResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create a new shortened link.
   *
   * @param opts - Link creation options
   * @returns The created link details including the short URL
   */
  async create(opts: CreateLinkOptions): Promise<CreatedLink> {
    return this.http.post<CreatedLink>(paths.links.base, opts);
  }

  /**
   * List all links for the authenticated user.
   *
   * @param opts - Optional pagination parameters. `limit` is clamped to 100.
   */
  async list(opts?: ListLinksOptions): Promise<PaginatedResponse<Link>> {
    const limit =
      opts?.limit !== undefined ? Math.min(opts.limit, MAX_LIST_LIMIT) : undefined;
    const offset = opts?.offset;

    const params: Record<string, string | number> = {};
    if (limit !== undefined) params.limit = limit;
    if (offset !== undefined) params.offset = offset;

    const raw = await this.http.get<RawListResponse>(paths.links.base, params);

    const data = raw.links ?? raw.data ?? [];
    return {
      data,
      limit: raw.pagination?.limit ?? limit ?? data.length,
      offset: raw.pagination?.offset ?? offset ?? 0,
      hasMore: raw.pagination?.hasMore ?? false,
    };
  }

  /**
   * Get a single link by its short code or full path.
   *
   * @param shortPath - The short code (e.g. "abc123") or namespaced path (e.g. "ns/slug")
   */
  async get(shortPath: string): Promise<Link> {
    return this.http.get<Link>(paths.links.byShortPath(shortPath));
  }

  /**
   * Update a link's settings.
   *
   * @param shortPath - The short code or full path of the link to update
   * @param opts - Fields to update (url, expiry, click limit, routing rules, OG meta, etc.)
   */
  async update(shortPath: string, opts: UpdateLinkOptions): Promise<Link> {
    return this.http.patch<Link>(paths.links.byShortPathForUpdate(shortPath), opts);
  }

  /**
   * Delete a link permanently.
   *
   * @param shortPath - The short code or full path of the link to delete
   */
  async delete(shortPath: string): Promise<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(paths.links.byShortPath(shortPath));
  }
}
