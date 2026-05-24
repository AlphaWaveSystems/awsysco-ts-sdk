import type { HttpClient } from "../http.js";
import type { Me } from "../types.js";

export class MeResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get the authenticated user's profile and plan information.
   */
  async get(): Promise<Me> {
    return this.http.get<Me>("/api/v1/me");
  }
}
