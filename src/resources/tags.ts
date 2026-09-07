import type { HttpClient } from "../http.js";
import { paths } from "../paths.js";
import type { TagsResult } from "../types.js";

export class TagsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Add one or more tags to a link.
   *
   * The platform requires an array body (`{tags: [...]}` — folders.js:128);
   * a bare `{tag: "..."}` body was never accepted, so passing a single
   * string here is a compatibility convenience, not the wire shape.
   *
   * @param shortPath - The short code or namespaced path
   * @param tags - A single tag or an array of tags to add
   */
  async add(shortPath: string, tags: string | string[]): Promise<TagsResult> {
    const tagList = Array.isArray(tags) ? tags : [tags];
    return this.http.post<TagsResult>(paths.tags.forLink(shortPath), { tags: tagList });
  }

  /**
   * Remove a tag from a link.
   *
   * @param shortPath - The short code or namespaced path
   * @param tag - The tag to remove
   */
  async remove(shortPath: string, tag: string): Promise<TagsResult> {
    return this.http.delete<TagsResult>(paths.tags.byTag(shortPath, tag));
  }
}
