import type { HttpClient } from "../http.js";
import { paths } from "../paths.js";
import type { CreateUtmTemplateOptions, UtmTemplate } from "../types.js";

interface MeResponse {
  utmTemplates?: UtmTemplate[];
}

export class UtmTemplatesResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List all UTM templates for the authenticated user.
   * No dedicated list route exists (ADR-003) — fetches GET /api/v1/me and
   * returns its `utmTemplates` array.
   */
  async list(): Promise<UtmTemplate[]> {
    const me = await this.http.get<MeResponse>(paths.utmTemplates.viaMe);
    return me.utmTemplates ?? [];
  }

  /**
   * Create a new UTM template.
   *
   * The platform reads `utmSource`/`utmMedium`/`utmCampaign` — the plain
   * `source`/`medium`/`campaign` aliases are accepted here for compatibility
   * but are normalized to the wire field names before sending.
   *
   * @param opts - The UTM template fields
   */
  async create(opts: CreateUtmTemplateOptions): Promise<UtmTemplate> {
    const body: Record<string, string> = { name: opts.name };
    const utmSource = opts.utmSource ?? opts.source;
    const utmMedium = opts.utmMedium ?? opts.medium;
    const utmCampaign = opts.utmCampaign ?? opts.campaign;
    if (utmSource !== undefined) body.utmSource = utmSource;
    if (utmMedium !== undefined) body.utmMedium = utmMedium;
    if (utmCampaign !== undefined) body.utmCampaign = utmCampaign;
    if (opts.term !== undefined) body.term = opts.term;
    if (opts.content !== undefined) body.content = opts.content;
    return this.http.post<UtmTemplate>(paths.utmTemplates.create, body);
  }

  /**
   * Delete a UTM template by ID.
   *
   * @param id - The template ID to delete
   */
  async delete(id: string): Promise<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(paths.utmTemplates.byId(id));
  }
}
