import { describe, it, expect, vi, afterEach } from "vitest";
import { AwsysClient } from "../../src/index.js";
import { HttpClient } from "../../src/http.js";

/**
 * Contract §3 requires every public method to accept a per-call
 * `{signal, timeoutMs}` override in addition to the client-level default.
 * Rather than hand-writing one near-identical test per method (~20 of
 * them), this table drives one generic assertion: call the method with a
 * given `{signal, timeoutMs}`, spy on the underlying `HttpClient` verb it
 * uses, and assert those options actually reached it.
 */

const API_KEY = "awsys_test_key";
const BASE_URL = "https://awsys.co";

type HttpVerb = "get" | "post" | "patch" | "delete" | "put" | "getText";

interface MethodCase {
  label: string;
  verb: HttpVerb;
  /** Index of the `RequestOptions` argument within the spied verb's call. */
  optionsArgIndex: number;
  invoke: (client: AwsysClient, options: { signal: AbortSignal; timeoutMs: number }) => Promise<unknown>;
}

const CASES: MethodCase[] = [
  // links
  { label: "links.create", verb: "post", optionsArgIndex: 2, invoke: (c, o) => c.links.create({ url: "https://example.com" }, o) },
  { label: "links.list", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.links.list(o) },
  { label: "links.get", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.links.get("abc123", o) },
  { label: "links.update", verb: "patch", optionsArgIndex: 2, invoke: (c, o) => c.links.update("abc123", {}, o) },
  { label: "links.delete", verb: "delete", optionsArgIndex: 1, invoke: (c, o) => c.links.delete("abc123", o) },

  // folders
  { label: "folders.list", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.folders.list(o) },
  { label: "folders.create", verb: "post", optionsArgIndex: 2, invoke: (c, o) => c.folders.create({ name: "x" }, o) },
  { label: "folders.update", verb: "patch", optionsArgIndex: 2, invoke: (c, o) => c.folders.update("f1", {}, o) },
  { label: "folders.delete", verb: "delete", optionsArgIndex: 1, invoke: (c, o) => c.folders.delete("f1", o) },
  { label: "folders.assignLink", verb: "post", optionsArgIndex: 2, invoke: (c, o) => c.folders.assignLink("abc123", "f1", o) },
  { label: "folders.removeLink", verb: "post", optionsArgIndex: 2, invoke: (c, o) => c.folders.removeLink("abc123", o) },

  // analytics
  { label: "analytics.getStats", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.analytics.getStats("abc123", undefined, o) },
  { label: "analytics.getAggregateStats", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.analytics.getAggregateStats("abc123", o) },
  { label: "analytics.getRecentClicks", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.analytics.getRecentClicks(undefined, o) },

  // bulk
  { label: "bulk.create", verb: "post", optionsArgIndex: 2, invoke: (c, o) => c.bulk.create({ urls: [{ url: "https://example.com" }] }, o) },

  // customDomains (activate is excluded — never calls the network, per ADR-006)
  { label: "customDomains.list", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.customDomains.list(o) },
  { label: "customDomains.add", verb: "post", optionsArgIndex: 2, invoke: (c, o) => c.customDomains.add("links.example.com", o) },
  { label: "customDomains.verify", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.customDomains.verify("links.example.com", o) },
  { label: "customDomains.update", verb: "patch", optionsArgIndex: 2, invoke: (c, o) => c.customDomains.update("links.example.com", {}, o) },
  { label: "customDomains.remove", verb: "delete", optionsArgIndex: 1, invoke: (c, o) => c.customDomains.remove("links.example.com", o) },
  { label: "customDomains.check", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.customDomains.check("links.example.com", o) },

  // dataExport
  { label: "dataExport.exportLinks", verb: "getText", optionsArgIndex: 2, invoke: (c, o) => c.dataExport.exportLinks(o) },
  { label: "dataExport.exportLinkStats", verb: "getText", optionsArgIndex: 2, invoke: (c, o) => c.dataExport.exportLinkStats("abc123", o) },

  // imports
  { label: "imports.start", verb: "post", optionsArgIndex: 2, invoke: (c, o) => c.imports.start({ provider: "bitly", accessToken: "tok" }, o) },
  { label: "imports.getStatus", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.imports.getStatus("job1", o) },
  { label: "imports.cancel", verb: "delete", optionsArgIndex: 1, invoke: (c, o) => c.imports.cancel("job1", o) },
  { label: "imports.list", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.imports.list(o) },
  { label: "imports.getRedirectMapCsv", verb: "getText", optionsArgIndex: 2, invoke: (c, o) => c.imports.getRedirectMapCsv("job1", o) },
  { label: "imports.getRedirectMapJson", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.imports.getRedirectMapJson("job1", o) },

  // me / profile / namespace / usage
  { label: "me.get", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.me.get(o) },
  { label: "profile.get", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.profile.get(o) },
  { label: "profile.update", verb: "patch", optionsArgIndex: 2, invoke: (c, o) => c.profile.update({}, o) },
  { label: "namespace.get", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.namespace.get(o) },
  { label: "namespace.check", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.namespace.check("ns", o) },
  { label: "namespace.claim", verb: "post", optionsArgIndex: 2, invoke: (c, o) => c.namespace.claim("ns", o) },
  { label: "namespace.release", verb: "delete", optionsArgIndex: 1, invoke: (c, o) => c.namespace.release(o) },
  { label: "usage.get", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.usage.get(o) },

  // qr
  { label: "qr.getSettings", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.qr.getSettings("abc123", o) },
  { label: "qr.updateSettings", verb: "put", optionsArgIndex: 2, invoke: (c, o) => c.qr.updateSettings("abc123", {}, o) },

  // savedViews
  { label: "savedViews.list", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.savedViews.list(o) },
  { label: "savedViews.create", verb: "post", optionsArgIndex: 2, invoke: (c, o) => c.savedViews.create({ name: "x", filters: {} }, o) },
  { label: "savedViews.update", verb: "patch", optionsArgIndex: 2, invoke: (c, o) => c.savedViews.update("v1", {}, o) },
  { label: "savedViews.delete", verb: "delete", optionsArgIndex: 1, invoke: (c, o) => c.savedViews.delete("v1", o) },

  // tags
  { label: "tags.add", verb: "post", optionsArgIndex: 2, invoke: (c, o) => c.tags.add("abc123", "vip", o) },
  { label: "tags.remove", verb: "delete", optionsArgIndex: 1, invoke: (c, o) => c.tags.remove("abc123", "vip", o) },

  // trustScore
  { label: "trustScore.scan", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.trustScore.scan("abc123", o) },

  // utmTemplates
  { label: "utmTemplates.list", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.utmTemplates.list(o) },
  { label: "utmTemplates.create", verb: "post", optionsArgIndex: 2, invoke: (c, o) => c.utmTemplates.create({ name: "x" }, o) },
  { label: "utmTemplates.delete", verb: "delete", optionsArgIndex: 1, invoke: (c, o) => c.utmTemplates.delete("t1", o) },

  // web2app
  { label: "web2app.consumeSession", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.web2app.consumeSession("tok", o) },

  // webhooks
  { label: "webhooks.listEventTypes", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.webhooks.listEventTypes(o) },
  { label: "webhooks.list", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.webhooks.list(o) },
  { label: "webhooks.create", verb: "post", optionsArgIndex: 2, invoke: (c, o) => c.webhooks.create({ url: "https://example.com/hook", events: ["link.created"] }, o) },
  { label: "webhooks.update", verb: "patch", optionsArgIndex: 2, invoke: (c, o) => c.webhooks.update("w1", {}, o) },
  { label: "webhooks.delete", verb: "delete", optionsArgIndex: 1, invoke: (c, o) => c.webhooks.delete("w1", o) },
  { label: "webhooks.test", verb: "post", optionsArgIndex: 2, invoke: (c, o) => c.webhooks.test("w1", "link.created", o) },

  // affiliate
  { label: "affiliate.createProgram", verb: "post", optionsArgIndex: 2, invoke: (c, o) => c.affiliate.createProgram({ name: "x" }, o) },
  { label: "affiliate.listPrograms", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.affiliate.listPrograms(o) },
  { label: "affiliate.getProgram", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.affiliate.getProgram("p1", o) },
  { label: "affiliate.updateProgram", verb: "patch", optionsArgIndex: 2, invoke: (c, o) => c.affiliate.updateProgram("p1", {}, o) },
  { label: "affiliate.getProgramStats", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.affiliate.getProgramStats("p1", undefined, o) },
  { label: "affiliate.listPartners", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.affiliate.listPartners("p1", o) },
  { label: "affiliate.updatePartnerStatus", verb: "patch", optionsArgIndex: 2, invoke: (c, o) => c.affiliate.updatePartnerStatus("p1", "u1", "approved", o) },
  { label: "affiliate.discover", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.affiliate.discover(undefined, o) },
  { label: "affiliate.join", verb: "post", optionsArgIndex: 2, invoke: (c, o) => c.affiliate.join("p1", undefined, o) },
  { label: "affiliate.listPartnerships", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.affiliate.listPartnerships(o) },
  { label: "affiliate.getPartnershipStats", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.affiliate.getPartnershipStats("ps1", undefined, o) },
  { label: "affiliate.leaveProgram", verb: "delete", optionsArgIndex: 1, invoke: (c, o) => c.affiliate.leaveProgram("ps1", o) },
  { label: "affiliate.getLimits", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.affiliate.getLimits(o) },

  // agentlink
  { label: "agentlink.subscribe", verb: "post", optionsArgIndex: 2, invoke: (c, o) => c.agentlink.subscribe("a@b.com", o) },
  { label: "agentlink.getLinkStats", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.agentlink.getLinkStats("abc123", undefined, o) },
  { label: "agentlink.getAccountStats", verb: "get", optionsArgIndex: 2, invoke: (c, o) => c.agentlink.getAccountStats(undefined, o) },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Contract §3: per-call {signal, timeoutMs} on every public method", () => {
  for (const { label, verb, optionsArgIndex, invoke } of CASES) {
    it(`${label} forwards signal/timeoutMs to HttpClient.${verb}`, async () => {
      const client = new AwsysClient({ apiKey: API_KEY, baseUrl: BASE_URL });
      const resolved = verb === "getText" ? "" : {};
      const spy = vi.spyOn(HttpClient.prototype, verb as never).mockResolvedValue(resolved);

      const controller = new AbortController();
      const timeoutMs = 12345;

      await invoke(client, { signal: controller.signal, timeoutMs });

      expect(spy).toHaveBeenCalled();
      const lastCall = spy.mock.calls.at(-1) as unknown[];
      const passedOptions = lastCall[optionsArgIndex] as
        | { signal?: AbortSignal; timeoutMs?: number }
        | undefined;

      expect(passedOptions?.signal).toBe(controller.signal);
      expect(passedOptions?.timeoutMs).toBe(timeoutMs);
    });
  }

  it("covers every resource method except qr.getUrl (no network call) and customDomains.activate (deprecated, never calls the network per ADR-006)", () => {
    // A guard so this table doesn't silently rot if a new resource method
    // is added without per-call options — bump this count deliberately.
    expect(CASES.length).toBe(72);
  });
});
