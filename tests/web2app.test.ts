import { describe, it, expect, vi, beforeEach } from "vitest";
import { Web2AppResource } from "../src/resources/web2app.js";
import type { HttpClient } from "../src/http.js";
import type { Web2AppSession } from "../src/types.js";

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

describe("Web2AppResource", () => {
  let http: HttpClient;
  let web2app: Web2AppResource;

  beforeEach(() => {
    http = mockHttp();
    web2app = new Web2AppResource(http);
  });

  describe("consumeSession", () => {
    it("calls GET /api/v1/web2app/:token and returns the session", async () => {
      const expected: Web2AppSession = {
        success: true,
        linkId: "link_123",
        utmParams: { utm_source: "newsletter", utm_medium: "email" },
        routingRule: { country: "US", redirectUrl: "https://example.com/us" },
        country: "US",
        clickedAt: "2026-06-27T12:00:00Z",
      };
      vi.mocked(http.get).mockResolvedValue(expected);

      const result = await web2app.consumeSession("tok_abc123");

      expect(http.get).toHaveBeenCalledWith("/api/v1/web2app/tok_abc123");
      expect(result).toEqual(expected);
    });

    it("URL-encodes the token", async () => {
      vi.mocked(http.get).mockResolvedValue({
        success: true,
        linkId: "link_1",
        utmParams: {},
        routingRule: null,
        country: null,
        clickedAt: null,
      });

      await web2app.consumeSession("tok/with+special");

      expect(http.get).toHaveBeenCalledWith(
        "/api/v1/web2app/tok%2Fwith%2Bspecial",
      );
    });

    it("handles a null routingRule and null nullable fields", async () => {
      vi.mocked(http.get).mockResolvedValue({
        success: true,
        linkId: "link_2",
        utmParams: {},
        routingRule: null,
        country: null,
        clickedAt: null,
      });

      const result = await web2app.consumeSession("tok_xyz");
      expect(result.routingRule).toBeNull();
      expect(result.country).toBeNull();
      expect(result.clickedAt).toBeNull();
    });
  });
});
