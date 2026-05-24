import { describe, it, expect } from "vitest";
import { AwsysClient } from "../src/index.js";

const BASE_URL = process.env.AWSYS_BASE_URL ?? "https://staging.awsys.co";

const client = new AwsysClient({
  apiKey: process.env.AWSYS_API_KEY!,
  baseUrl: BASE_URL,
});

describe("QR", () => {
  describe("getUrl", () => {
    it("returns a URL string for a short code", () => {
      const url = client.qr.getUrl("abc123");

      expect(typeof url).toBe("string");
      expect(url).toContain("/api/qr/abc123");
      expect(url).toMatch(/^https?:\/\//);
    });

    it("uses the configured base URL", () => {
      const url = client.qr.getUrl("testcode");
      expect(url.startsWith(BASE_URL)).toBe(true);
    });

    it("returns URL without query params when no options passed", () => {
      const url = client.qr.getUrl("abc123");
      // No query string should be appended when no options
      expect(url).not.toContain("?");
    });

    it("appends size param when specified", () => {
      const url = client.qr.getUrl("abc123", { size: 256 });
      expect(url).toContain("size=256");
    });

    it("appends color param when specified", () => {
      const url = client.qr.getUrl("abc123", { color: "ff0000" });
      expect(url).toContain("color=ff0000");
    });

    it("appends bgColor param when specified", () => {
      const url = client.qr.getUrl("abc123", { bgColor: "ffffff" });
      expect(url).toContain("bgColor=ffffff");
    });

    it("appends all params when all options specified", () => {
      const url = client.qr.getUrl("abc123", {
        size: 512,
        color: "000000",
        bgColor: "ffffff",
      });

      expect(url).toContain("size=512");
      expect(url).toContain("color=000000");
      expect(url).toContain("bgColor=ffffff");
    });

    it("URL-encodes special characters in the short code", () => {
      const url = client.qr.getUrl("ns/slug");
      // "ns/slug" should be encoded
      expect(url).toContain("ns%2Fslug");
    });

    it("returns a valid parseable URL", () => {
      const url = client.qr.getUrl("abc123", { size: 300, color: "333333" });
      expect(() => new URL(url)).not.toThrow();
    });
  });
});
