import { describe, it, expect, vi, beforeEach } from "vitest";
import { WebhooksResource } from "../src/resources/webhooks.js";
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

const sampleWebhook = {
  id: "wh1",
  url: "https://example.com/hook",
  events: ["link.created", "link.deleted"],
  name: "My Webhook",
  enabled: true,
  createdAt: "2026-06-01T00:00:00Z",
  updatedAt: "2026-06-01T00:00:00Z",
  lastTriggered: null,
  failureCount: 0,
};

describe("WebhooksResource", () => {
  let http: HttpClient;
  let webhooks: WebhooksResource;

  beforeEach(() => {
    http = mockHttp();
    webhooks = new WebhooksResource(http);
  });

  describe("listEventTypes", () => {
    it("calls GET /api/webhooks/event-types", async () => {
      const expected = {
        eventTypes: ["link.created", "link.deleted"],
        descriptions: { "link.created": "Fired when a link is created" },
      };
      vi.mocked(http.get).mockResolvedValue(expected);

      const result = await webhooks.listEventTypes();

      expect(http.get).toHaveBeenCalledWith("/api/webhooks/event-types");
      expect(result).toEqual(expected);
    });
  });

  describe("list", () => {
    it("calls GET /api/webhooks and returns webhooks list", async () => {
      const expected = { webhooks: [sampleWebhook], limit: 10, used: 1 };
      vi.mocked(http.get).mockResolvedValue(expected);

      const result = await webhooks.list();

      expect(http.get).toHaveBeenCalledWith("/api/webhooks");
      expect(result.webhooks).toHaveLength(1);
      expect(result.limit).toBe(10);
    });
  });

  describe("create", () => {
    it("calls POST /api/webhooks and returns the created webhook", async () => {
      const opts = {
        url: "https://example.com/hook",
        events: ["link.created"],
        name: "My Webhook",
      };
      vi.mocked(http.post).mockResolvedValue(sampleWebhook);

      const result = await webhooks.create(opts);

      expect(http.post).toHaveBeenCalledWith("/api/webhooks", opts);
      expect(result.id).toBe("wh1");
    });

    it("accepts optional secret in create options", async () => {
      const opts = {
        url: "https://example.com/hook",
        events: ["link.click"],
        secret: "my-secret",
      };
      vi.mocked(http.post).mockResolvedValue(sampleWebhook);

      await webhooks.create(opts);

      expect(http.post).toHaveBeenCalledWith("/api/webhooks", opts);
    });
  });

  describe("update", () => {
    it("calls PATCH /api/webhooks/:id with partial update", async () => {
      const updated = { ...sampleWebhook, enabled: false };
      vi.mocked(http.patch).mockResolvedValue(updated);

      const result = await webhooks.update("wh1", { enabled: false });

      expect(http.patch).toHaveBeenCalledWith("/api/webhooks/wh1", { enabled: false });
      expect(result.enabled).toBe(false);
    });
  });

  describe("delete", () => {
    it("calls DELETE /api/webhooks/:id", async () => {
      vi.mocked(http.delete).mockResolvedValue({ success: true });

      const result = await webhooks.delete("wh1");

      expect(http.delete).toHaveBeenCalledWith("/api/webhooks/wh1");
      expect(result).toEqual({ success: true });
    });
  });

  describe("test", () => {
    it("calls POST /api/webhooks/:id/test with eventType", async () => {
      const expected = { success: true, statusCode: 200, responseTime: 145 };
      vi.mocked(http.post).mockResolvedValue(expected);

      const result = await webhooks.test("wh1", "link.created");

      expect(http.post).toHaveBeenCalledWith("/api/webhooks/wh1/test", {
        eventType: "link.created",
      });
      expect(result.statusCode).toBe(200);
    });
  });
});
