import type { HttpClient, RequestOptions } from "../http.js";
import { paths } from "../paths.js";
import type { CreateUtmTemplateOptions, UtmTemplate } from "../types.js";

interface RawUtmTemplate {
  id: string;
  name: string;
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

interface MeResponse {
  utmTemplates?: RawUtmTemplate[];
}

function mapUtmTemplate(raw: RawUtmTemplate): UtmTemplate {
  return {
    ...raw,
    // Deprecated legacy aliases — kept for compat (ADR-014), mapped from
    // the real wire fields (source/medium/campaign, not utmSource/etc.).
    utmSource: raw.source,
    utmMedium: raw.medium,
    utmCampaign: raw.campaign,
  };
}

let listWarned = false;

export class UtmTemplatesResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List all UTM templates for the authenticated user.
   *
   * @remarks **Currently non-functional via API key** (platform issue #831,
   * not an SDK bug): no dedicated `GET /api/user/utm-templates` route
   * exists, and `/api/v1/me` — the only endpoint this could piggyback on
   * per ADR-003 — does not actually include `utmTemplates` in its
   * response. This method will always return `[]` until #831 ships. The
   * SDK does not throw, since the platform itself doesn't error here; it
   * silently (and misleadingly) omits the data, so a one-shot console
   * warning is the appropriate signal rather than an exception.
   */
  async list(options?: RequestOptions): Promise<UtmTemplate[]> {
    if (!listWarned) {
      listWarned = true;
      console.warn(
        "[@awsysco/sdk] utmTemplates.list() currently always returns an empty array: " +
          "/api/v1/me does not include utmTemplates and no GET /api/user/utm-templates route " +
          "exists via API key (platform issue #831). This is a server-side limitation, not an SDK bug.",
      );
    }
    const me = await this.http.get<MeResponse>(paths.utmTemplates.viaMe, undefined, options);
    return (me.utmTemplates ?? []).map(mapUtmTemplate);
  }

  /**
   * Create a new UTM template.
   *
   * @remarks As of contract fixture 1.0.9 this currently 500s server-side
   * (an unrelated `uuidv4 undefined` bug, tracked as platform issue #831)
   * regardless of what the SDK sends — but the SDK sends the field names
   * the platform's own code actually reads (`source`/`medium`/`campaign`,
   * confirmed against `user.js:355`), not the previously-assumed
   * `utmSource`/`utmMedium`/`utmCampaign`, so this is at least no longer
   * guaranteed to fail on a field-name mismatch once #831 is fixed.
   *
   * @param opts - The UTM template fields
   */
  async create(
    opts: CreateUtmTemplateOptions,
    options?: RequestOptions,
  ): Promise<UtmTemplate> {
    const body: Record<string, string> = { name: opts.name };
    const source = opts.source ?? opts.utmSource;
    const medium = opts.medium ?? opts.utmMedium;
    const campaign = opts.campaign ?? opts.utmCampaign;
    if (source !== undefined) body.source = source;
    if (medium !== undefined) body.medium = medium;
    if (campaign !== undefined) body.campaign = campaign;
    if (opts.term !== undefined) body.term = opts.term;
    if (opts.content !== undefined) body.content = opts.content;
    const raw = await this.http.post<{ success?: boolean; template?: RawUtmTemplate }>(
      paths.utmTemplates.create,
      body,
      options,
    );
    // The real response always nests under `template` — falling back to the
    // raw body itself guards against an unexpected/malformed response
    // shape rather than throwing on a missing key.
    return mapUtmTemplate(raw.template ?? (raw as unknown as RawUtmTemplate));
  }

  /**
   * Delete a UTM template by ID.
   *
   * @param id - The template ID to delete
   */
  async delete(id: string, options?: RequestOptions): Promise<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(paths.utmTemplates.byId(id), options);
  }
}
