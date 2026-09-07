import type { HttpClient, RequestOptions } from "../http.js";
import { paths } from "../paths.js";
import type { Me } from "../types.js";

export class MeResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get the authenticated user's profile and plan information.
   */
  async get(options?: RequestOptions): Promise<Me> {
    return this.http.get<Me>(paths.me.base, undefined, options);
  }
}
