import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentlinkResource } from "../src/resources/agentlink.js";
import type { HttpClient } from "../src/http.js";

function mockHttp(overrides: Partial<HttpClient> = {}): HttpClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
    getText: vi.fn(),
    request: vi.fn(),
    ...overrides,
  } as unknown as HttpClient;
}

const sampleStats = {
  totalAgentClicks: 42,
  agentClicks: [
    { agent: "claude", count: 30 },
    { agent: "gpt-4", count: 12 },
  ],
  periodDays: 7,
};

describe("AgentlinkResource", () => {
  let http: HttpClient;
  let agentlink: AgentlinkResource;

  beforeEach(() => {
    http = mockHttp();
    agentlink = new AgentlinkResource(http);
  });

  describe("subscribe", () => {
    it("calls POST /api/agentlink/subscribe with { email }", async () => {
      vi.mocked(http.post).mockResolvedValue({ success: true });

      const result = await agentlink.subscribe("user@example.com");

      expect(http.post).toHaveBeenCalledWith("/api/agentlink/subscribe", {
        email: "user@example.com",
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe("getLinkStats", () => {
    it("calls GET /api/agentlink/links/:short/stats", async () => {
      vi.mocked(http.get).mockResolvedValue(sampleStats);

      const result = await agentlink.getLinkStats("abc123");

      expect(http.get).toHaveBeenCalledWith(
        "/api/agentlink/links/abc123/stats",
        {},
      );
      expect(result.totalAgentClicks).toBe(42);
    });

    it("passes periodDays as period query param", async () => {
      vi.mocked(http.get).mockResolvedValue(sampleStats);

      await agentlink.getLinkStats("abc123", 14);

      expect(http.get).toHaveBeenCalledWith(
        "/api/agentlink/links/abc123/stats",
        { period: 14 },
      );
    });

    it("URL-encodes namespaced short paths", async () => {
      vi.mocked(http.get).mockResolvedValue(sampleStats);

      await agentlink.getLinkStats("ns/slug");

      expect(http.get).toHaveBeenCalledWith(
        "/api/agentlink/links/ns%2Fslug/stats",
        {},
      );
    });
  });

  describe("getAccountStats", () => {
    it("calls GET /api/agentlink/account/stats", async () => {
      vi.mocked(http.get).mockResolvedValue(sampleStats);

      const result = await agentlink.getAccountStats();

      expect(http.get).toHaveBeenCalledWith("/api/agentlink/account/stats", {});
      expect(result.periodDays).toBe(7);
    });

    it("passes periodDays when provided", async () => {
      vi.mocked(http.get).mockResolvedValue(sampleStats);

      await agentlink.getAccountStats(30);

      expect(http.get).toHaveBeenCalledWith("/api/agentlink/account/stats", {
        period: 30,
      });
    });
  });
});
