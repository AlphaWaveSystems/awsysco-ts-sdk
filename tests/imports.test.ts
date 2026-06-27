import { describe, it, expect, vi, beforeEach } from "vitest";
import { ImportsResource } from "../src/resources/imports.js";
import type { HttpClient } from "../src/http.js";
import type { ImportJob } from "../src/types.js";

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

function makeJob(overrides: Partial<ImportJob> = {}): ImportJob {
  return {
    id: "imp_123",
    userId: "user_1",
    provider: "bitly",
    status: "completed",
    scanOnly: false,
    targetNamespace: null,
    scopeFilter: null,
    counts: { fetched: 10, transformed: 10, written: 10, errored: 0 },
    errors: [],
    createdAt: "2026-06-27T12:00:00Z",
    updatedAt: "2026-06-27T12:05:00Z",
    ...overrides,
  };
}

describe("ImportsResource", () => {
  let http: HttpClient;
  let imports: ImportsResource;

  beforeEach(() => {
    http = mockHttp();
    imports = new ImportsResource(http);
  });

  describe("start", () => {
    it("POSTs a snake_case body to /api/v1/imports and parses the job", async () => {
      const expected = makeJob({ status: "queued" });
      vi.mocked(http.post).mockResolvedValue(expected);

      const result = await imports.start({
        provider: "bitly",
        accessToken: "tok_secret",
        targetNamespace: "acme",
        scanOnly: true,
      });

      expect(http.post).toHaveBeenCalledWith("/api/v1/imports", {
        provider: "bitly",
        access_token: "tok_secret",
        target_namespace: "acme",
        scan_only: true,
      });
      expect(result).toEqual(expected);
    });

    it("omits optional fields when not provided", async () => {
      vi.mocked(http.post).mockResolvedValue(makeJob());

      await imports.start({ provider: "bitly", accessToken: "tok" });

      expect(http.post).toHaveBeenCalledWith("/api/v1/imports", {
        provider: "bitly",
        access_token: "tok",
      });
    });

    it("forwards scan_only: false explicitly when set", async () => {
      vi.mocked(http.post).mockResolvedValue(makeJob());

      await imports.start({
        provider: "bitly",
        accessToken: "tok",
        scanOnly: false,
      });

      expect(http.post).toHaveBeenCalledWith("/api/v1/imports", {
        provider: "bitly",
        access_token: "tok",
        scan_only: false,
      });
    });
  });

  describe("getStatus", () => {
    it("GETs /api/v1/imports/:jobId", async () => {
      const expected = makeJob({ status: "running" });
      vi.mocked(http.get).mockResolvedValue(expected);

      const result = await imports.getStatus("imp_123");

      expect(http.get).toHaveBeenCalledWith("/api/v1/imports/imp_123");
      expect(result).toEqual(expected);
    });

    it("URL-encodes the job id", async () => {
      vi.mocked(http.get).mockResolvedValue(makeJob());

      await imports.getStatus("imp/abc 1");

      expect(http.get).toHaveBeenCalledWith("/api/v1/imports/imp%2Fabc%201");
    });
  });

  describe("cancel", () => {
    it("DELETEs /api/v1/imports/:jobId and returns the job", async () => {
      const expected = makeJob({ status: "cancelled" });
      vi.mocked(http.delete).mockResolvedValue(expected);

      const result = await imports.cancel("imp_123");

      expect(http.delete).toHaveBeenCalledWith("/api/v1/imports/imp_123");
      expect(result.status).toBe("cancelled");
    });
  });

  describe("list", () => {
    it("GETs /api/v1/imports and unwraps the jobs array", async () => {
      const jobs = [makeJob({ id: "imp_1" }), makeJob({ id: "imp_2" })];
      vi.mocked(http.get).mockResolvedValue({ jobs });

      const result = await imports.list();

      expect(http.get).toHaveBeenCalledWith("/api/v1/imports", {});
      expect(result).toEqual(jobs);
    });

    it("forwards the limit query param", async () => {
      vi.mocked(http.get).mockResolvedValue({ jobs: [] });

      await imports.list({ limit: 5 });

      expect(http.get).toHaveBeenCalledWith("/api/v1/imports", { limit: 5 });
    });
  });

  describe("waitForCompletion", () => {
    it("resolves once a terminal status is reached", async () => {
      const sequence = [
        makeJob({ status: "queued" }),
        makeJob({ status: "running" }),
        makeJob({ status: "completed" }),
      ];
      let call = 0;
      vi.mocked(http.get).mockImplementation(async () => sequence[call++]);

      const result = await imports.waitForCompletion("imp_123", {
        pollIntervalMs: 1,
        timeoutMs: 1000,
      });

      expect(result.status).toBe("completed");
      expect(http.get).toHaveBeenCalledTimes(3);
    });

    it("resolves on non-completed terminal statuses (failed/partial/cancelled)", async () => {
      vi.mocked(http.get).mockResolvedValue(makeJob({ status: "failed" }));

      const result = await imports.waitForCompletion("imp_123", {
        pollIntervalMs: 1,
        timeoutMs: 1000,
      });

      expect(result.status).toBe("failed");
      expect(http.get).toHaveBeenCalledTimes(1);
    });

    it("rejects with a clear error on timeout", async () => {
      vi.mocked(http.get).mockResolvedValue(makeJob({ status: "running" }));

      await expect(
        imports.waitForCompletion("imp_123", {
          pollIntervalMs: 1,
          timeoutMs: 5,
        }),
      ).rejects.toThrow(/did not reach a terminal status within 5ms/);
    });
  });
});
