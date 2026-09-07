import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AwsysClient } from "../src/index.js";

const client = new AwsysClient({
  apiKey: process.env.AWSYS_API_KEY ?? "awsys_test_placeholder",
  baseUrl: process.env.AWSYS_BASE_URL ?? "https://staging.awsys.co",
});

describe.skipIf(!process.env.AWSYS_API_KEY)("Folders", () => {
  let createdFolderId: string;
  let linkShortCode: string;
  let setupSkip = false;

  beforeAll(async () => {
    try {
      const result = await client.links.create({
        url: `https://example.com/sdk-folder-test-${Date.now()}`,
      });
      linkShortCode = result.shortCode;
    } catch (e: any) {
      if (e?.code === "EMAIL_NOT_VERIFIED" || e?.message?.toLowerCase().includes("verification")) {
        setupSkip = true;
      } else {
        throw e;
      }
    }
  });

  afterAll(async () => {
    if (createdFolderId) {
      try {
        await client.folders.delete(createdFolderId);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe("create", () => {
    it("creates a folder and returns id and name", async (ctx) => {
      if (setupSkip) ctx.skip();
      const folderName = `sdk-test-folder-${Date.now()}`;
      const folder = await client.folders.create({ name: folderName });

      expect(folder.id).toBeTruthy();
      expect(folder.name).toBe(folderName);

      createdFolderId = folder.id;
    });

    it("creates a folder with a color", async (ctx) => {
      if (setupSkip) ctx.skip();
      const folderName = `sdk-test-colored-${Date.now()}`;
      const folder = await client.folders.create({
        name: folderName,
        color: "3b82f6",
      });

      expect(folder.id).toBeTruthy();
      expect(folder.name).toBe(folderName);

      await client.folders.delete(folder.id);
    });

    it("returns error when name is missing", async (ctx) => {
      if (setupSkip) ctx.skip();
      await expect(
        client.folders.create({ name: "" }),
      ).rejects.toThrow();
    });
  });

  describe("list", () => {
    it("returns an array of folders", async (ctx) => {
      if (setupSkip) ctx.skip();
      const folders = await client.folders.list();

      expect(Array.isArray(folders)).toBe(true);
    });

    it("contains the folder we created", async (ctx) => {
      if (setupSkip) ctx.skip();
      const folders = await client.folders.list();
      const found = folders.find((f) => f.id === createdFolderId);
      expect(found).toBeTruthy();
    });
  });

  describe("assignLink and removeLink", () => {
    it("assigns a link to a folder", async (ctx) => {
      if (setupSkip) ctx.skip();
      await expect(
        client.folders.assignLink(linkShortCode, createdFolderId),
      ).resolves.not.toThrow();
    });

    it("removes a link from a folder", async (ctx) => {
      if (setupSkip) ctx.skip();
      await expect(
        client.folders.removeLink(linkShortCode),
      ).resolves.not.toThrow();
    });
  });

  describe("delete", () => {
    it("deletes a folder successfully", async (ctx) => {
      if (setupSkip) ctx.skip();
      const folder = await client.folders.create({
        name: `sdk-disposable-${Date.now()}`,
      });
      await expect(client.folders.delete(folder.id)).resolves.not.toThrow();
    });

    it("returns error when folder not found", async (ctx) => {
      if (setupSkip) ctx.skip();
      await expect(
        client.folders.delete("definitely-does-not-exist-xyz"),
      ).rejects.toThrow();
    });
  });
});
