import type { HttpClient } from "../http.js";
import type { CreateUtmTemplateOptions, UtmTemplate } from "../types.js";

interface MeResponse {
  utmTemplates?: UtmTemplate[];
}

export class UtmTemplatesResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List all UTM templates for the authenticated user.
   * Fetches from GET /api/v1/me and returns the utmTemplates array.
   */
  async list(): Promise<UtmTemplate[]> {
    const me = await this.http.get<MeResponse>("/api/v1/me");
    return me.utmTemplates ?? [];
  }

  /**
   * Create a new UTM template.
   *
   * @param opts - The UTM template fields
   */
  async create(opts: CreateUtmTemplateOptions): Promise<{ success: boolean; template: UtmTemplate }> {
    return this.http.post<{ success: boolean; template: UtmTemplate }>(
      "/api/user/utm-templates",
      opts,
    );
  }

  /**
   * Delete a UTM template by ID.
   *
   * @param id - The template ID to delete
   */
  async delete(id: string): Promise<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `/api/user/utm-templates/${encodeURIComponent(id)}`,
    );
  }
}
