import type { HttpClient } from "../http.js";
import { paths } from "../paths.js";
import type { UpdateProfileOptions, UserProfile } from "../types.js";

/**
 * The authenticated user's editable profile (distinct from
 * {@link MeResource}, which returns static plan/feature info, and
 * {@link UsageResource}, which returns live consumption stats).
 */
export class ProfileResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get the authenticated user's profile.
   */
  async get(): Promise<UserProfile> {
    return this.http.get<UserProfile>(paths.profile.base);
  }

  /**
   * Update the authenticated user's profile.
   */
  async update(opts: UpdateProfileOptions): Promise<UserProfile> {
    return this.http.patch<UserProfile>(paths.profile.base, opts);
  }
}
