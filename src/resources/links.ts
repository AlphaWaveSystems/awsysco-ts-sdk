import type { HttpClient } from "../http.js";
import type {
  CreateLinkOptions,
  CreatedLink,
  Link,
  ListLinksOptions,
  PaginatedResponse,
  UpdateLinkOptions,
} from "../types.js";

interface RawListResponse {
  links?: Link[];
  data?: Link[];
  total?: number;
  hasMore?: boolean;
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
    return this.http.post<CreatedLink>("/api/v1/links", opts);
  }

  /**
   * List all links for the authenticated user.
   *
   * @param opts - Optional pagination parameters
   */
  async list(opts?: ListLinksOptions): Promise<PaginatedResponse<Link>> {
    const params: Record<string, string | number> = {};
    if (opts?.limit !== undefined) params.limit = opts.limit;
    if (opts?.offset !== undefined) params.offset = opts.offset;

    const raw = await this.http.get<RawListResponse>("/api/v1/links", params);

    const data = raw.links ?? raw.data ?? [];
    return {
      data,
      total: raw.total ?? data.length,
      hasMore: raw.hasMore ?? false,
    };
  }

  /**
   * Get a single link by its short code or full path.
   *
   * @param shortPath - The short code (e.g. "abc123") or namespaced path (e.g. "ns/slug")
   */
  async get(shortPath: string): Promise<Link> {
    return this.http.get<Link>(`/api/v1/links/${encodeURIComponent(shortPath)}`);
  }

  /**
   * Update a link's settings.
   *
   * @param shortPath - The short code or full path of the link to update
   * @param opts - Fields to update (url, expiry, click limit, routing rules, OG meta, etc.)
   */
  async update(shortPath: string, opts: UpdateLinkOptions): Promise<Link> {
    return this.http.patch<Link>(
      `/api/v1/links/${encodeURIComponent(shortPath)}`,
      opts,
    );
  }

  /**
   * Delete a link permanently.
   *
   * @param shortPath - The short code or full path of the link to delete
   */
  async delete(shortPath: string): Promise<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `/api/v1/links/${encodeURIComponent(shortPath)}`,
    );
  }
}
