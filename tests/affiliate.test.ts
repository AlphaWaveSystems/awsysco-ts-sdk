import { describe, it, expect, vi, beforeEach } from "vitest";
import { AffiliateResource } from "../src/resources/affiliate.js";
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

const sampleProgram = {
  id: "prog1",
  name: "My Affiliate Program",
  commissionType: "cpc" as const,
  cpcRate: 0.05,
  status: "active",
  createdAt: "2026-06-01T00:00:00Z",
};

const samplePartnership = {
  id: "part1",
  programId: "prog1",
  programName: "My Affiliate Program",
  partnerCode: "REF123",
  status: "active",
  joinedAt: "2026-06-01T00:00:00Z",
};

describe("AffiliateResource", () => {
  let http: HttpClient;
  let affiliate: AffiliateResource;

  beforeEach(() => {
    http = mockHttp();
    affiliate = new AffiliateResource(http);
  });

  describe("createProgram", () => {
    it("calls POST /api/affiliate/programs with options", async () => {
      const opts = {
        name: "My Affiliate Program",
        commissionType: "cpc" as const,
        cpcRate: 0.05,
      };
      vi.mocked(http.post).mockResolvedValue(sampleProgram);

      const result = await affiliate.createProgram(opts);

      expect(http.post).toHaveBeenCalledWith("/api/affiliate/programs", opts);
      expect(result.id).toBe("prog1");
    });
  });

  describe("listPrograms", () => {
    it("calls GET /api/affiliate/programs and unwraps the {programs:[]} envelope", async () => {
      vi.mocked(http.get).mockResolvedValue({ programs: [sampleProgram] });

      const result = await affiliate.listPrograms();

      expect(http.get).toHaveBeenCalledWith("/api/affiliate/programs");
      expect(result).toHaveLength(1);
    });
  });

  describe("getProgram", () => {
    it("calls GET /api/affiliate/programs/:id", async () => {
      vi.mocked(http.get).mockResolvedValue(sampleProgram);

      const result = await affiliate.getProgram("prog1");

      expect(http.get).toHaveBeenCalledWith("/api/affiliate/programs/prog1");
      expect(result.name).toBe("My Affiliate Program");
    });
  });

  describe("updateProgram", () => {
    it("calls PATCH /api/affiliate/programs/:id with partial update", async () => {
      const updated = { ...sampleProgram, cpcRate: 0.10 };
      vi.mocked(http.patch).mockResolvedValue(updated);

      const result = await affiliate.updateProgram("prog1", { cpcRate: 0.10 });

      expect(http.patch).toHaveBeenCalledWith("/api/affiliate/programs/prog1", { cpcRate: 0.10 });
      expect(result.cpcRate).toBe(0.10);
    });
  });

  describe("getProgramStats", () => {
    it("calls GET /api/affiliate/programs/:id/stats", async () => {
      const stats = { totalClicks: 100, totalCommissions: 5.0 };
      vi.mocked(http.get).mockResolvedValue(stats);

      const result = await affiliate.getProgramStats("prog1");

      expect(http.get).toHaveBeenCalledWith(
        "/api/affiliate/programs/prog1/stats",
        {},
      );
      expect(result).toEqual(stats);
    });

    it("passes period param when provided", async () => {
      vi.mocked(http.get).mockResolvedValue({});

      await affiliate.getProgramStats("prog1", "30d");

      expect(http.get).toHaveBeenCalledWith(
        "/api/affiliate/programs/prog1/stats",
        { period: "30d" },
      );
    });
  });

  describe("listPartners", () => {
    it("calls GET /api/affiliate/programs/:id/partners and unwraps the {partners:[]} envelope", async () => {
      const partners = [
        { id: "p1", partnerId: "user1", status: "approved", partnerCode: "REF1" },
      ];
      vi.mocked(http.get).mockResolvedValue({ partners });

      const result = await affiliate.listPartners("prog1");

      expect(http.get).toHaveBeenCalledWith(
        "/api/affiliate/programs/prog1/partners",
      );
      expect(result).toHaveLength(1);
    });
  });

  describe("updatePartnerStatus", () => {
    it("calls PATCH /api/affiliate/programs/:id/partners/:pid", async () => {
      const updatedPartner = { id: "p1", partnerId: "user1", status: "rejected" };
      vi.mocked(http.patch).mockResolvedValue(updatedPartner);

      const result = await affiliate.updatePartnerStatus("prog1", "p1", "rejected");

      expect(http.patch).toHaveBeenCalledWith(
        "/api/affiliate/programs/prog1/partners/p1",
        { status: "rejected" },
      );
      expect(result.status).toBe("rejected");
    });
  });

  describe("discover", () => {
    it("calls GET /api/affiliate/discover and unwraps the {programs:[]} envelope", async () => {
      vi.mocked(http.get).mockResolvedValue({ programs: [sampleProgram] });

      const result = await affiliate.discover();

      expect(http.get).toHaveBeenCalledWith("/api/affiliate/discover", {});
      expect(result).toHaveLength(1);
    });

    it("passes limit when provided", async () => {
      vi.mocked(http.get).mockResolvedValue({ programs: [] });

      await affiliate.discover(10);

      expect(http.get).toHaveBeenCalledWith("/api/affiliate/discover", { limit: 10 });
    });
  });

  describe("join", () => {
    it("calls POST /api/affiliate/join/:programId", async () => {
      vi.mocked(http.post).mockResolvedValue(samplePartnership);

      const result = await affiliate.join("prog1");

      expect(http.post).toHaveBeenCalledWith("/api/affiliate/join/prog1", {});
      expect(result.id).toBe("part1");
    });

    it("passes partnerCode when provided", async () => {
      vi.mocked(http.post).mockResolvedValue(samplePartnership);

      await affiliate.join("prog1", "MYCODE");

      expect(http.post).toHaveBeenCalledWith("/api/affiliate/join/prog1", {
        partnerCode: "MYCODE",
      });
    });
  });

  describe("listPartnerships", () => {
    it("calls GET /api/affiliate/partnerships and unwraps the {partnerships:[]} envelope", async () => {
      vi.mocked(http.get).mockResolvedValue({ partnerships: [samplePartnership] });

      const result = await affiliate.listPartnerships();

      expect(http.get).toHaveBeenCalledWith("/api/affiliate/partnerships");
      expect(result).toHaveLength(1);
    });
  });

  describe("getPartnershipStats", () => {
    it("calls GET /api/affiliate/partnerships/:id/stats", async () => {
      const stats = { totalClicks: 50 };
      vi.mocked(http.get).mockResolvedValue(stats);

      await affiliate.getPartnershipStats("part1");

      expect(http.get).toHaveBeenCalledWith(
        "/api/affiliate/partnerships/part1/stats",
        {},
      );
    });
  });

  describe("leaveProgram", () => {
    it("calls DELETE /api/affiliate/partnerships/:id", async () => {
      vi.mocked(http.delete).mockResolvedValue({ success: true });

      const result = await affiliate.leaveProgram("part1");

      expect(http.delete).toHaveBeenCalledWith("/api/affiliate/partnerships/part1");
      expect(result).toEqual({ success: true });
    });
  });

  describe("getLimits", () => {
    it("calls GET /api/affiliate/limits", async () => {
      const limits = {
        tier: "pro",
        limits: { maxPrograms: 3 },
        usage: { programs: 1 },
      };
      vi.mocked(http.get).mockResolvedValue(limits);

      const result = await affiliate.getLimits();

      expect(http.get).toHaveBeenCalledWith("/api/affiliate/limits");
      expect(result.tier).toBe("pro");
    });
  });
});
