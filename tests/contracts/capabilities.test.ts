import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { AwsysClient } from "../../src/index.js";
import { AwsysForbiddenError } from "../../src/errors.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const contract = JSON.parse(
  readFileSync(resolve(__dirname, "sdk-contract.json"), "utf-8"),
) as {
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
 * Every scenario ID exercised by a test in this file, populated as tests
 * run. Checked at the end (see "Contract: coverage" below) against the full
 * fixture so an un-mapped capability fails loudly instead of being silently
 * absent from the suite.
 */
const coveredIds = new Set<string>();

/** Marks a scenario as covered without mocking fetch (e.g. for a scenario the SDK deliberately never calls). */
function markCovered(id: string): ReturnType<typeof scenario> {
  coveredIds.add(id);
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
    expect(result).toMatchObject(s.response.body as object);
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

// Not yet covered this milestone (out of scope — resources untouched by
// Milestone 1/2): tags, qr, customDomains (all but the deprecated activate()
// above), savedViews, utmTemplates, webhooks, affiliate, agentlink,
// namespace, dataExport, trustScore, bulk, usage, me, web2app. Their
// capability scenarios are left for Milestone 3 once those resources are
// routed through src/paths.ts. The "Contract: coverage" test below fails
// loudly listing exactly which scenario IDs remain, per Gate 3.
describe("Contract: coverage", () => {
  it("every capability scenario is exercised by a test in this file (Gate 3)", () => {
    // Depends on every `it` above having already run and populated
    // `coveredIds` — this must stay the last test in the file.
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
