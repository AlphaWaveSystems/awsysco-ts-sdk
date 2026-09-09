import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { AwsysClient } from "../../src/index.js";
import { AwsysForbiddenError } from "../../src/errors.js";
import { parseTimestamp } from "../../src/timestamps.js";

/**
 * Deep-equals `actual` against `raw` except for the named fields, which are
 * compared against `parseTimestamp(raw[field])` instead — for scenarios
 * whose fixture body carries a raw Firestore timestamp shape that the SDK
 * correctly normalizes (ADR-017/ADR-024: a blind `toEqual(response.body)`
 * doesn't survive that normalization, and shouldn't — it should assert
 * through what the SDK actually returns).
 */
function toEqualWithTimestamps(
  actual: unknown,
  raw: Record<string, unknown>,
  timestampFields: string[],
): void {
  const expected = { ...raw };
  for (const field of timestampFields) {
    if (field in expected) expected[field] = parseTimestamp(expected[field]);
  }
  expect(actual).toEqual(expected);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
// Overridable so CI's contract-drift workflow can run this same suite
// against a freshly-fetched platform contract without touching the
// vendored copy in the working tree.
const contractPath = process.env.AWSYS_CONTRACT_FIXTURE_PATH ?? resolve(__dirname, "sdk-contract.json");
const contract = JSON.parse(readFileSync(contractPath, "utf-8")) as {
  capabilities: Array<{
    id: string;
    request: {
      method: string;
      path: string;
      query: Record<string, string>;
      body: unknown;
    };
    response: { status: number; body: unknown };
    content_type?: string;
  }>;
};

const API_KEY = "awsys_test_key";
const BASE_URL = "https://awsys.co";

const client = new AwsysClient({ apiKey: API_KEY, baseUrl: BASE_URL });

function scenario(id: string) {
  const found = contract.capabilities.find((c) => c.id === id);
  if (!found) throw new Error(`Missing contract capability scenario: ${id}`);
  return found;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function textResponse(status: number, body: string): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/csv" },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Every scenario ID this file exercises, derived by statically scanning this
 * file's OWN source text for `scenario("...")`/`mockScenario("...")`/
 * `markCovered("...")` calls — not by recording which tests actually ran.
 * A runtime-populated Set would under-report coverage (and thus under- or
 * over-fail) whenever the suite runs under `--shard` or `.only`, since only
 * executed test bodies would register their IDs. Static text analysis is
 * collection-time, not execution-time, so it's correct regardless of which
 * subset of tests actually run.
 */
const coveredIds = new Set(
  [...readFileSync(fileURLToPath(import.meta.url), "utf-8").matchAll(
    /(?:mockScenario|markCovered|scenario)\(\s*"([^"]+)"/g,
  )].map((m) => m[1]),
);

/** Marks a scenario as covered without mocking fetch (e.g. for a scenario the SDK deliberately never calls). */
function markCovered(id: string): ReturnType<typeof scenario> {
  return scenario(id);
}

/** Queues the scenario's documented response as the next fetch() resolution. */
function mockScenario(id: string, isText = false) {
  const s = markCovered(id);
  fetchMock.mockResolvedValueOnce(
    isText
      ? textResponse(s.response.status, s.response.body as string)
      : jsonResponse(s.response.status, s.response.body),
  );
  return s;
}

/** Asserts the single fetch() call matches the scenario's documented wire request. */
function expectRequestMatches(s: ReturnType<typeof scenario>) {
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  const parsed = new URL(url);

  expect(init.method).toBe(s.request.method);
  expect(parsed.pathname).toBe(s.request.path);

  for (const [key, value] of Object.entries(s.request.query ?? {})) {
    expect(parsed.searchParams.get(key)).toBe(String(value));
  }

  if (s.request.body !== null && s.request.body !== undefined) {
    expect(JSON.parse(init.body as string)).toEqual(s.request.body);
  }

  const headers = init.headers as Record<string, string>;
  expect(headers.Authorization).toBe(`Bearer ${API_KEY}`);
}

describe("Contract: capabilities — links", () => {
  it("create_link", async () => {
    const s = mockScenario("create_link");
    const result = await client.links.create({ url: "https://example.com/" });
    expectRequestMatches(s);
    expect(result).toMatchObject(s.response.body as object);
  });

  it("create_link_custom_slug", async () => {
    const s = mockScenario("create_link_custom_slug");
    const result = await client.links.create({
      url: "https://example.com/",
      customSlug: "my-slug",
      expiresAt: "2027-01-01T00:00:00.000Z",
      maxClicks: 10,
    });
    expectRequestMatches(s);
    expect(result).toMatchObject(s.response.body as object);
  });

  it("list_links", async () => {
    const s = mockScenario("list_links");
    const result = await client.links.list({ limit: 2, offset: 0 });
    expectRequestMatches(s);
    expect(result.data).toHaveLength(2);
    expect(result.hasMore).toBe(true);
    expect(result.limit).toBe(2);
    expect(result.offset).toBe(0);
  });

  it("list_links_last_page", async () => {
    const s = mockScenario("list_links_last_page");
    const result = await client.links.list({ limit: 2, offset: 2 });
    expectRequestMatches(s);
    expect(result.data).toHaveLength(1);
    expect(result.hasMore).toBe(false);
  });

  it("list_links_missing_hasmore", async () => {
    const s = mockScenario("list_links_missing_hasmore");
    const result = await client.links.list({ limit: 2, offset: 0 });
    expectRequestMatches(s);
    expect(result.data).toEqual([]);
    expect(result.hasMore).toBe(false);
  });

  it("list_links_limit_clamped (caller passes 500, SDK clamps to 100)", async () => {
    const s = mockScenario("list_links_limit_clamped");
    const result = await client.links.list({ limit: 500, offset: 0 });
    expectRequestMatches(s);
    expect(result.hasMore).toBe(false);
  });

  it("get_link", async () => {
    const s = mockScenario("get_link");
    const result = await client.links.get("abc123");
    expectRequestMatches(s);
    expect(result).toMatchObject(s.response.body as object);
  });

  it("get_link_namespaced (slash NOT encoded for GET)", async () => {
    const s = mockScenario("get_link_namespaced");
    const result = await client.links.get("ns/slug");
    expectRequestMatches(s);
    expect(result).toMatchObject(s.response.body as object);
  });

  it("update_link", async () => {
    const s = mockScenario("update_link");
    const result = await client.links.update("abc123", {
      maxClicks: 5,
      expiresAt: "2027-01-01T00:00:00.000Z",
    });
    expectRequestMatches(s);
    expect(result).toMatchObject(s.response.body as object);
  });

  it("delete_link", async () => {
    const s = mockScenario("delete_link");
    const result = await client.links.delete("abc123");
    expectRequestMatches(s);
    expect(result).toMatchObject(s.response.body as object);
  });
});

describe("Contract: capabilities — analytics", () => {
  it("link_stats", async () => {
    const s = mockScenario("link_stats");
    const result = await client.analytics.getStats("abc123", "7d");
    expectRequestMatches(s);
    expect(result).toMatchObject(s.response.body as object);
  });

  it("aggregate_stats", async () => {
    const s = mockScenario("aggregate_stats");
    const result = await client.analytics.getAggregateStats("abc123", { period: "7d" });
    expectRequestMatches(s);
    // ADR-019's "byCountry/byDay" remapping was itself wrong (a bad
    // fixture, not a real API shape) — reverted per ADR-022, live-verified
    // against staging. The real field names ARE countryBreakdown/
    // clicksByDay, matching the type directly; assert through the declared
    // fields (not a blind toEqual) so a real future mismatch still fails
    // loudly.
    const body = s.response.body as {
      shortCode: string;
      fullPath: string | null;
      period: string;
      totalClicks: number;
      botClicksExcluded: number;
      uniqueVisitors: number;
      clicksByDay: { date: string; clicks: number }[];
      countryBreakdown: Record<string, number>;
      deviceBreakdown: { mobile: number; desktop: number; tablet: number };
      referrerBreakdown: Record<string, number>;
      browserBreakdown: Record<string, number>;
      osBreakdown: Record<string, number>;
      hourBreakdown: { hour: number; clicks: number }[];
      tierLimit: number;
      tier: string;
    };
    expect(result.shortCode).toBe(body.shortCode);
    expect(result.fullPath).toBe(body.fullPath);
    expect(result.period).toBe(body.period);
    expect(result.totalClicks).toBe(body.totalClicks);
    expect(result.botClicksExcluded).toBe(body.botClicksExcluded);
    expect(result.uniqueVisitors).toBe(body.uniqueVisitors);
    expect(result.clicksByDay).toEqual(body.clicksByDay);
    expect(result.countryBreakdown).toEqual(body.countryBreakdown);
    expect(result.deviceBreakdown).toEqual(body.deviceBreakdown);
    expect(result.referrerBreakdown).toEqual(body.referrerBreakdown);
    expect(result.browserBreakdown).toEqual(body.browserBreakdown);
    expect(result.osBreakdown).toEqual(body.osBreakdown);
    expect(result.hourBreakdown).toEqual(body.hourBreakdown);
    expect(result.tierLimit).toBe(body.tierLimit);
    expect(result.tier).toBe(body.tier);
  });

  it("recent_clicks", async () => {
    const s = mockScenario("recent_clicks");
    const result = await client.analytics.getRecentClicks({ limit: 10 });
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });
});

describe("Contract: capabilities — profile", () => {
  it("profile_get", async () => {
    const s = mockScenario("profile_get");
    const result = await client.profile.get();
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });

  it("profile_update", async () => {
    const s = mockScenario("profile_update");
    const result = await client.profile.update({ displayName: "New" });
    expectRequestMatches(s);
    // Response is {success, displayName} — no uid/email echoed back, unlike
    // profile_get. update() has its own UpdateProfileResult type, distinct
    // from UserProfile, rather than falsely claiming uid/email (ADR-019).
    expect(result.success).toBe(true);
    expect(result.displayName).toBe("New");
    expect(result).toEqual(s.response.body);
  });
});

describe("Contract: capabilities — folders", () => {
  it("folders_list", async () => {
    const s = mockScenario("folders_list");
    const result = await client.folders.list();
    expectRequestMatches(s);
    expect(result).toEqual((s.response.body as { folders: unknown[] }).folders);
  });

  it("folder_create", async () => {
    const s = mockScenario("folder_create");
    const result = await client.folders.create({ name: "Work" });
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });

  it("folder_update (unversioned path per ADR-011)", async () => {
    const s = mockScenario("folder_update");
    const result = await client.folders.update("f1", { name: "Work2" });
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });

  it("folder_delete", async () => {
    const s = mockScenario("folder_delete");
    await client.folders.delete("f1");
    expectRequestMatches(s);
  });

  it("folder_assign", async () => {
    const s = mockScenario("folder_assign");
    await client.folders.assignLink("abc123", "f1");
    expectRequestMatches(s);
  });

  it("folder_remove (null must be sent, not omitted)", async () => {
    const s = mockScenario("folder_remove");
    await client.folders.removeLink("abc123");
    expectRequestMatches(s);
  });
});

describe("Contract: capabilities — imports", () => {
  it("import_start (camelCase body)", async () => {
    const s = mockScenario("import_start");
    const result = await client.imports.start({
      provider: "bitly",
      accessToken: "bitly_token",
      scanOnly: true,
    });
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });

  it("imports_list", async () => {
    const s = mockScenario("imports_list");
    const result = await client.imports.list({ limit: 20 });
    expectRequestMatches(s);
    expect(result).toEqual((s.response.body as { jobs: unknown[] }).jobs);
  });

  it("import_get (getStatus)", async () => {
    const s = mockScenario("import_get");
    const result = await client.imports.getStatus("j1");
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });

  it("import_cancel", async () => {
    const s = mockScenario("import_cancel");
    const result = await client.imports.cancel("j1");
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });

  it("import_redirect_map_csv", async () => {
    const s = mockScenario("import_redirect_map_csv", true);
    const result = await client.imports.getRedirectMapCsv("j1");
    expectRequestMatches(s);
    expect(result).toBe(s.response.body);
  });

  it("import_redirect_map_json", async () => {
    const s = mockScenario("import_redirect_map_json");
    const result = await client.imports.getRedirectMapJson("j1");
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });
});

describe("Contract: capabilities — customDomains (deprecated activate)", () => {
  it("domain_activate_deprecated: SDK must not call, raises AuthorizationError-equivalent", async () => {
    const s = markCovered("domain_activate_deprecated");
    expect(s.expect_error).toBe("AuthorizationError");

    await expect(client.customDomains.activate("go.example.com")).rejects.toBeInstanceOf(
      AwsysForbiddenError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("Contract: capabilities — analytics (legacy call style)", () => {
  it("recent_clicks accepts the old positional limit argument (ADR-014 compat)", async () => {
    const s = mockScenario("recent_clicks");
    const result = await client.analytics.getRecentClicks(10);
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });
});

describe("Contract: capabilities — bulk / me / usage", () => {
  it("bulk_create", async () => {
    const s = mockScenario("bulk_create");
    const result = await client.bulk.create({
      urls: [{ url: "https://a.example/" }, { url: "https://b.example/", customSlug: "b" }],
    });
    expectRequestMatches(s);
    // Assert through the declared type's field names, not a blind toEqual —
    // `created`/`failed`/`total` live under `summary` on the wire, not
    // top-level, so the type must actually mirror that nesting (ADR-019).
    const body = s.response.body as {
      success: boolean;
      summary: { total: number; created: number; failed: number };
      results: unknown[];
    };
    expect(result.success).toBe(body.success);
    expect(result.summary.total).toBe(body.summary.total);
    expect(result.summary.created).toBe(body.summary.created);
    expect(result.summary.failed).toBe(body.summary.failed);
    expect(result.results).toEqual(body.results);
  });

  it("me", async () => {
    const s = mockScenario("me");
    const result = await client.me.get();
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });

  it("usage", async () => {
    const s = mockScenario("usage");
    const result = await client.usage.get();
    expectRequestMatches(s);
    // Every UsageStats field maps 1:1 by name from the wire response
    // (verified live, contract fixture 1.0.6) — plain passthrough now.
    expect(result).toEqual(s.response.body);
  });
});

describe("Contract: capabilities — qr", () => {
  it("qr_url (client-side URL builder, no network call)", () => {
    const s = markCovered("qr_url");
    const url = client.qr.getUrl("abc123", { size: 300, color: "000000", bgColor: "ffffff" });
    const parsed = new URL(url);
    expect(parsed.pathname).toBe(s.request.path);
    for (const [key, value] of Object.entries(s.request.query)) {
      expect(parsed.searchParams.get(key)).toBe(String(value));
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("qr_settings_get", async () => {
    const s = mockScenario("qr_settings_get");
    const result = await client.qr.getSettings("abc123");
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });

  it("qr_settings_update", async () => {
    const s = mockScenario("qr_settings_update");
    const result = await client.qr.updateSettings("abc123", { color: "#ff0000" });
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });
});

describe("Contract: capabilities — tags", () => {
  it("tags_add (array body, folders.js:128 requires it)", async () => {
    const s = mockScenario("tags_add");
    const result = await client.tags.add("abc123", ["a", "b"]);
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });

  it("tag_remove", async () => {
    const s = mockScenario("tag_remove");
    const result = await client.tags.remove("abc123", "a");
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });
});

describe("Contract: capabilities — savedViews", () => {
  it("views_list", async () => {
    const s = mockScenario("views_list");
    const result = await client.savedViews.list();
    expectRequestMatches(s);
    // Fixture 1.0.11's real staging snapshot has Firestore-shaped
    // createdAt/updatedAt — the SDK normalizes these to ISO strings, so a
    // blind toEqual(response.body) would fail; assert per-field instead.
    const body = s.response.body as {
      views: { id: string; name: string; createdAt: unknown; updatedAt: unknown }[];
    };
    expect(result.views).toHaveLength(body.views.length);
    result.views.forEach((view, i) => {
      expect(view.id).toBe(body.views[i]?.id);
      expect(view.name).toBe(body.views[i]?.name);
      expect(typeof view.createdAt).toBe("string");
      expect(typeof view.updatedAt).toBe("string");
    });
  });

  it("view_create", async () => {
    const s = mockScenario("view_create");
    const result = await client.savedViews.create({ name: "Mine", filters: { tag: "a" } });
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });

  it("view_update", async () => {
    const s = mockScenario("view_update");
    await client.savedViews.update("v1", { name: "Yours" });
    expectRequestMatches(s);
  });

  it("view_delete", async () => {
    const s = mockScenario("view_delete");
    await client.savedViews.delete("v1");
    expectRequestMatches(s);
  });
});

describe("Contract: capabilities — utmTemplates", () => {
  it("utm_list (GET /api/user/utm-templates, platform issue #833)", async () => {
    const s = mockScenario("utm_list");
    const result = await client.utmTemplates.list();
    expectRequestMatches(s);
    const body = s.response.body as {
      templates: { id: string; name: string; source: string; medium: string; campaign: string }[];
    };
    expect(result).toHaveLength(body.templates.length);
    expect(result[0]?.id).toBe(body.templates[0]?.id);
    expect(result[0]?.name).toBe(body.templates[0]?.name);
    expect(result[0]?.source).toBe(body.templates[0]?.source);
    expect(result[0]?.medium).toBe(body.templates[0]?.medium);
    expect(result[0]?.campaign).toBe(body.templates[0]?.campaign);
    // Deprecated legacy aliases still populated for compat (ADR-014).
    expect(result[0]?.utmSource).toBe(body.templates[0]?.source);
  });

  it("utm_create (source/medium/campaign — the platform's real field names, not utmSource/etc.)", async () => {
    const s = mockScenario("utm_create");
    const result = await client.utmTemplates.create({
      name: "Launch",
      source: "newsletter",
      medium: "email",
      campaign: "sept",
    });
    expectRequestMatches(s);
    // Response nests under `template`, not flat top-level fields — assert
    // through the resource's actual unwrapping/mapping, not a blind
    // toEqual(response.body) (ADR-019).
    const body = s.response.body as {
      template: { id: string; name: string; source: string; medium: string; campaign: string };
    };
    expect(result.id).toBe(body.template.id);
    expect(result.name).toBe(body.template.name);
    expect(result.source).toBe(body.template.source);
    expect(result.medium).toBe(body.template.medium);
    expect(result.campaign).toBe(body.template.campaign);
    // Deprecated legacy aliases still populated for compat (ADR-014).
    expect(result.utmSource).toBe(body.template.source);
    expect(result.utmMedium).toBe(body.template.medium);
    expect(result.utmCampaign).toBe(body.template.campaign);
  });

  it("utm_create accepts the deprecated utmSource/utmMedium/utmCampaign aliases too", async () => {
    const s = mockScenario("utm_create");
    await client.utmTemplates.create({
      name: "Launch",
      utmSource: "newsletter",
      utmMedium: "email",
      utmCampaign: "sept",
    });
    // The outgoing request must still use the real wire field names
    // (source/medium/campaign) even when the caller used the deprecated
    // alias names.
    expectRequestMatches(s);
  });

  it("utm_delete", async () => {
    const s = mockScenario("utm_delete");
    const result = await client.utmTemplates.delete("t1");
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });
});

describe("Contract: capabilities — webhooks", () => {
  it("webhook_event_types (unversioned, no v1 twin)", async () => {
    const s = mockScenario("webhook_event_types");
    const result = await client.webhooks.listEventTypes();
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });

  it("webhooks_list (versioned)", async () => {
    const s = mockScenario("webhooks_list");
    const result = await client.webhooks.list();
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });

  it("webhook_create (versioned)", async () => {
    const s = mockScenario("webhook_create");
    const result = await client.webhooks.create({
      url: "https://h.example/",
      events: ["link.created"],
    });
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
    expect((result as { enabled?: boolean }).enabled).toBe(true);
  });

  it("webhook_update (unversioned — no v1 twin, enabled field)", async () => {
    const s = mockScenario("webhook_update");
    const result = await client.webhooks.update("w1", { enabled: false });
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });

  it("webhook_delete (versioned)", async () => {
    const s = mockScenario("webhook_delete");
    const result = await client.webhooks.delete("w1");
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });

  it("webhook_test (versioned)", async () => {
    const s = mockScenario("webhook_test");
    const result = await client.webhooks.test("w1", "link.created");
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });
});

describe("Contract: capabilities — customDomains", () => {
  it("domains_list", async () => {
    const s = mockScenario("domains_list");
    const result = await client.customDomains.list();
    expectRequestMatches(s);
    const body = s.response.body as {
      domains: { domain: string; status: string; verificationToken: string }[];
    };
    // `status` is kept as a broad `string` (not a narrow union) since the
    // full set of real values isn't confirmed — assert through it rather
    // than hardcoding one observed value.
    expect(result.domains[0]?.status).toBe(body.domains[0]?.status);
    expect(result.domains[0]?.domain).toBe(body.domains[0]?.domain);
    expect(result.domains[0]?.verificationToken).toBe(body.domains[0]?.verificationToken);
  });

  it("domain_add", async () => {
    const s = mockScenario("domain_add");
    const result = await client.customDomains.add("go.example.com");
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });

  it("domain_verify", async () => {
    const s = mockScenario("domain_verify");
    const result = await client.customDomains.verify("go.example.com");
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });

  it("domain_update", async () => {
    const s = mockScenario("domain_update");
    const result = await client.customDomains.update("go.example.com", {
      defaultRedirect: "https://example.com/",
    });
    expectRequestMatches(s);
    // Response omits `status` entirely — CustomDomain.status is optional
    // for exactly this reason (ADR-019).
    expect(result.status).toBeUndefined();
    expect(result.defaultRedirect).toBe("https://example.com/");
    expect(result).toEqual(s.response.body);
  });

  it("domain_remove", async () => {
    const s = mockScenario("domain_remove");
    const result = await client.customDomains.remove("go.example.com");
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });

  it("domain_check", async () => {
    const s = mockScenario("domain_check");
    const result = await client.customDomains.check("go.example.com");
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });
});

describe("Contract: capabilities — namespace", () => {
  it("namespace_get", async () => {
    const s = mockScenario("namespace_get");
    const result = await client.namespace.get();
    expectRequestMatches(s);
    // ADR-022: adds namespaceData/canClaimSubdomain/canClaimCustomDomain
    // (real fields, verified live), drops the phantom upgradeRequired.
    // namespaceData.claimedAt is Firestore-shaped on the wire — normalized
    // to an ISO string, so assert per-field rather than a blind toEqual.
    const body = s.response.body as {
      hasAccess: boolean;
      namespace: string;
      tier: string;
      canClaimSubdomain: boolean;
      canClaimCustomDomain: boolean;
      namespaceData: { userEmail: string; isActive: boolean; tier: string; userId: string };
    };
    expect(result.hasAccess).toBe(body.hasAccess);
    expect(result.namespace).toBe(body.namespace);
    expect(result.tier).toBe(body.tier);
    expect(result.canClaimSubdomain).toBe(body.canClaimSubdomain);
    expect(result.canClaimCustomDomain).toBe(body.canClaimCustomDomain);
    expect(result.namespaceData?.userEmail).toBe(body.namespaceData.userEmail);
    expect(result.namespaceData?.isActive).toBe(body.namespaceData.isActive);
    expect(typeof result.namespaceData?.claimedAt).toBe("string");
    expect(result.upgradeRequired).toBeUndefined();
  });

  it("namespace_check", async () => {
    const s = mockScenario("namespace_check");
    const result = await client.namespace.check("acme");
    expectRequestMatches(s);
    // reason/previewUrl are absent here — both optional on
    // NamespaceCheckResult for exactly this reason (ADR-019).
    expect(result.reason).toBeUndefined();
    expect(result.previewUrl).toBeUndefined();
    expect(result).toEqual(s.response.body);
  });

  it("namespace_claim", async () => {
    const s = mockScenario("namespace_claim");
    const result = await client.namespace.claim("acme");
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });

  it("namespace_release", async () => {
    const s = mockScenario("namespace_release");
    const result = await client.namespace.release();
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });
});

describe("Contract: capabilities — affiliate", () => {
  it("affiliate_program_create", async () => {
    const s = mockScenario("affiliate_program_create");
    const result = await client.affiliate.createProgram({
      name: "Launch Affiliate",
      commissionType: "cpc",
      cpcRate: 0.5,
      cookieDurationDays: 30,
    });
    expectRequestMatches(s);
    toEqualWithTimestamps(result, s.response.body as Record<string, unknown>, [
      "createdAt",
      "updatedAt",
    ]);
  });

  it("affiliate_programs_list (unwraps {programs:[]} envelope)", async () => {
    const s = mockScenario("affiliate_programs_list");
    const result = await client.affiliate.listPrograms();
    expectRequestMatches(s);
    // Fixture 1.0.11's real staging snapshot has Firestore-shaped
    // createdAt/updatedAt — the SDK normalizes these to ISO strings, so a
    // blind toEqual(response.body) would fail; assert per-field instead.
    const body = s.response.body as {
      programs: { id: string; name: string; status: string; commissionType: string }[];
    };
    expect(result).toHaveLength(body.programs.length);
    result.forEach((program, i) => {
      expect(program.id).toBe(body.programs[i]?.id);
      expect(program.name).toBe(body.programs[i]?.name);
      expect(program.status).toBe(body.programs[i]?.status);
      expect(program.commissionType).toBe(body.programs[i]?.commissionType);
      expect(typeof program.createdAt).toBe("string");
      expect(typeof program.updatedAt).toBe("string");
    });
  });

  it("affiliate_program_get", async () => {
    const s = mockScenario("affiliate_program_get");
    const result = await client.affiliate.getProgram("p1");
    expectRequestMatches(s);
    toEqualWithTimestamps(result, s.response.body as Record<string, unknown>, [
      "createdAt",
      "updatedAt",
    ]);
  });

  it("affiliate_program_update", async () => {
    const s = mockScenario("affiliate_program_update");
    const result = await client.affiliate.updateProgram("p1", { name: "P2" });
    expectRequestMatches(s);
    toEqualWithTimestamps(result, s.response.body as Record<string, unknown>, [
      "createdAt",
      "updatedAt",
    ]);
  });

  it("affiliate_program_stats", async () => {
    const s = mockScenario("affiliate_program_stats");
    const result = await client.affiliate.getProgramStats("p1", "30d");
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });

  it("affiliate_partners_list (unwraps {partners:[]} envelope)", async () => {
    const s = mockScenario("affiliate_partners_list");
    const result = await client.affiliate.listPartners("p1");
    expectRequestMatches(s);
    // partnerId is absent on list items — optional on AffiliatePartner for
    // exactly this reason (ADR-019).
    expect(result[0]?.partnerId).toBeUndefined();
    expect(result[0]?.status).toBe("pending");
    expect(result).toEqual((s.response.body as { partners: unknown[] }).partners);
  });

  it("affiliate_partner_status", async () => {
    const s = mockScenario("affiliate_partner_status");
    const result = await client.affiliate.updatePartnerStatus("p1", "pt1", "approved");
    expectRequestMatches(s);
    expect(result.partnerId).toBeUndefined();
    expect(result.status).toBe("approved");
    expect(result).toEqual(s.response.body);
  });

  it("affiliate_discover (unwraps {programs:[]} envelope, returns AffiliateProgramSummary — ADR-024)", async () => {
    const s = mockScenario("affiliate_discover");
    const result = await client.affiliate.discover(20);
    expectRequestMatches(s);
    // discover() is a public listing of OTHER users' programs — it returns
    // AffiliateProgramSummary, a distinct, narrower type from the owned
    // AffiliateProgram. commissionType IS present; status and every
    // owner-only field are not part of this type at all (fixture 1.0.12).
    expect(result[0]?.commissionType).toBe("cpa");
    expect(result[0]).not.toHaveProperty("status");
    expect(result).toEqual((s.response.body as { programs: unknown[] }).programs);
  });

  it("affiliate_join", async () => {
    const s = mockScenario("affiliate_join");
    const result = await client.affiliate.join("p9", "CODE");
    expectRequestMatches(s);
    toEqualWithTimestamps(result, s.response.body as Record<string, unknown>, [
      "createdAt",
      "updatedAt",
    ]);
  });

  it("affiliate_partnerships_list (unwraps {partnerships:[]} envelope)", async () => {
    const s = mockScenario("affiliate_partnerships_list");
    const result = await client.affiliate.listPartnerships();
    expectRequestMatches(s);
    // Fixture 1.0.11's real staging snapshot has Firestore-shaped
    // createdAt/updatedAt — the SDK normalizes these to ISO strings, so a
    // blind toEqual(response.body) would fail; assert per-field instead.
    const body = s.response.body as {
      partnerships: { id: string; programId: string; status: string; partnerCode?: string }[];
    };
    expect(result).toHaveLength(body.partnerships.length);
    result.forEach((partnership, i) => {
      expect(partnership.id).toBe(body.partnerships[i]?.id);
      expect(partnership.programId).toBe(body.partnerships[i]?.programId);
      expect(partnership.status).toBe(body.partnerships[i]?.status);
      expect(typeof partnership.createdAt).toBe("string");
      expect(typeof partnership.updatedAt).toBe("string");
    });
  });

  it("affiliate_partnership_stats", async () => {
    const s = mockScenario("affiliate_partnership_stats");
    const result = await client.affiliate.getPartnershipStats("ps1", "30d");
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });

  it("affiliate_leave", async () => {
    const s = mockScenario("affiliate_leave");
    const result = await client.affiliate.leaveProgram("ps1");
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });

  it("affiliate_limits", async () => {
    const s = mockScenario("affiliate_limits");
    const result = await client.affiliate.getLimits();
    expectRequestMatches(s);
    // ADR-019's fix here was itself wrong (a bad fixture, not a real API
    // shape) — reverted per ADR-022, live-verified against staging +
    // affiliate.js:184-197. Real shape is {tier, limits, usage}.
    const body = s.response.body as {
      tier: string;
      limits: Record<string, unknown>;
      usage: { programs: number; partnerships: number };
    };
    expect(result.tier).toBe(body.tier);
    expect(result.limits).toEqual(body.limits);
    expect(result.usage.programs).toBe(body.usage.programs);
    expect(result.usage.partnerships).toBe(body.usage.partnerships);
  });
});

describe("Contract: capabilities — agentlink", () => {
  it("agentlink_link_stats", async () => {
    const s = mockScenario("agentlink_link_stats");
    const result = await client.agentlink.getLinkStats("abc123", 30);
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });

  it("agentlink_account_stats", async () => {
    const s = mockScenario("agentlink_account_stats");
    const result = await client.agentlink.getAccountStats(30);
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });

  it("agentlink_subscribe (public endpoint — auth header still sent)", async () => {
    const s = mockScenario("agentlink_subscribe");
    const result = await client.agentlink.subscribe("t@example.com");
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });
});

describe("Contract: capabilities — web2app", () => {
  it("web2app_consume", async () => {
    const s = mockScenario("web2app_consume");
    const result = await client.web2app.consumeSession("tok123");
    expectRequestMatches(s);
    expect(result).toEqual(s.response.body);
  });
});

describe("Contract: capabilities — export", () => {
  it("export_links_csv", async () => {
    const s = mockScenario("export_links_csv", true);
    const result = await client.dataExport.exportLinks();
    expectRequestMatches(s);
    expect(result).toBe(s.response.body);
  });

  it("export_link_stats_csv", async () => {
    const s = mockScenario("export_link_stats_csv", true);
    const result = await client.dataExport.exportLinkStats("abc123");
    expectRequestMatches(s);
    expect(result).toBe(s.response.body);
  });
});

describe("Contract: capabilities — trustScore", () => {
  it("trust_scan (public endpoint — auth header still sent)", async () => {
    const s = mockScenario("trust_scan");
    const result = await client.trustScore.scan("abc123");
    expectRequestMatches(s);
    // The real wire field is `short` (ADR-022 — a prior fix had this
    // backwards, assuming `shortCode`). The SDK adds shortCode/score/status
    // as deprecated aliases mapped from the real fields, and normalizes
    // `createdAt` from its raw epoch-ms number to an ISO string.
    const body = s.response.body as {
      short: string;
      trustScore: number | null;
      trustStatus: string;
      threats: string[];
      scannedAt: string;
      source: string;
      createdAt: number;
    };
    expect(result.short).toBe(body.short);
    expect(result.trustScore).toBe(body.trustScore);
    expect(result.trustStatus).toBe(body.trustStatus);
    expect(result.threats).toEqual(body.threats);
    expect(result.source).toBe(body.source);
    expect(result.shortCode).toBe(body.short);
    expect(result.score).toBe(body.trustScore);
    expect(result.status).toBe(body.trustStatus);
    expect(result.createdAt).toBe(new Date(body.createdAt).toISOString());
  });
});

describe("Contract: coverage", () => {
  it("every capability scenario is exercised by a test in this file (Gate 3)", () => {
    // `coveredIds` is derived statically (see above), so this holds
    // regardless of test order, `--shard`, or `.only` elsewhere in the run.
    const missing = contract.capabilities
      .map((c) => c.id)
      .filter((id) => !coveredIds.has(id));

    if (missing.length > 0) {
      throw new Error(
        `${missing.length}/${contract.capabilities.length} capability scenario(s) not yet mapped to an SDK call ` +
          `(Milestone 3 scope — see the comment above this test):\n` +
          missing.map((id) => `  - ${id}`).join("\n"),
      );
    }
  });
});
