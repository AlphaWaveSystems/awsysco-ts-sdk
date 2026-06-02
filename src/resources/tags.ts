import type { HttpClient } from "../http.js";
import type { TagsResult } from "../types.js";

export class TagsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Add a tag to a link.
   *
   * @param shortPath - The short code or namespaced path
   * @param tag - The tag to add
   */
  async add(shortPath: string, tag: string): Promise<TagsResult> {
    return this.http.post<TagsResult>(
      `/api/link/${encodeURIComponent(shortPath)}/tags`,
      { tag },
    );
  }

  /**
   * Remove a tag from a link.
   *
   * @param shortPath - The short code or namespaced path
   * @param tag - The tag to remove
   */
  async remove(shortPath: string, tag: string): Promise<TagsResult> {
    return this.http.delete<TagsResult>(
      `/api/link/${encodeURIComponent(shortPath)}/tags/${encodeURIComponent(tag)}`,
    );
  }
}
