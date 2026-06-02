/**
 * Integration test script for @awsysco/sdk
 *
 * Exercises the main happy paths against a live API.
 * NOT wired into npm run test — run manually:
 *
 *   AWSYS_API_KEY=awsys_your_key npx ts-node examples/integration.ts
 *
 * or:
 *
 *   AWSYS_API_KEY=awsys_your_key npx tsx examples/integration.ts
 */

import { AwsysClient, AwsysError } from "../src/index.js";

const apiKey = process.env.AWSYS_API_KEY;
if (!apiKey) {
  console.error("AWSYS_API_KEY is required");
  process.exit(1);
}

const baseUrl = process.env.AWSYS_BASE_URL;
const client = new AwsysClient({ apiKey, ...(baseUrl ? { baseUrl } : {}) });

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`  FAIL  ${name}: ${message}`);
    failed++;
  }
}

async function main() {
  console.log("AWSYS.CO SDK Integration Tests");
  console.log(`Base URL: ${baseUrl ?? "https://awsys.co"}\n`);

  // ─── Me ───────────────────────────────────────────────────────────────────
  console.log("── Me ──");
  let userId = "";
  await test("me.get() returns uid + email + tier", async () => {
    const me = await client.me.get();
    if (!me.uid) throw new Error("uid missing");
    if (!me.email) throw new Error("email missing");
    if (!me.subscriptionTier) throw new Error("subscriptionTier missing");
    userId = me.uid;
    console.log(`     uid=${me.uid} tier=${me.subscriptionTier}`);
  });

  // ─── Links ────────────────────────────────────────────────────────────────
  console.log("\n── Links ──");
  let shortCode = "";
  await test("links.create() returns shortUrl + shortCode", async () => {
    const link = await client.links.create({
      url: `https://example.com/integration-${Date.now()}`,
    });
    if (!link.shortUrl) throw new Error("shortUrl missing");
    if (!link.shortCode) throw new Error("shortCode missing");
    shortCode = link.shortCode;
    console.log(`     shortCode=${shortCode}`);
  });

  await test("links.list() returns paginated response", async () => {
    const { data, total } = await client.links.list({ limit: 3 });
    if (!Array.isArray(data)) throw new Error("data is not an array");
    if (typeof total !== "number") throw new Error("total is not a number");
  });

  // ─── Analytics ────────────────────────────────────────────────────────────
  console.log("\n── Analytics ──");
  await test("analytics.getStats() returns stats for the link", async () => {
    if (!shortCode) throw new Error("no shortCode from create test");
    const stats = await client.analytics.getStats(shortCode);
    if (typeof stats.totalClicks !== "number") throw new Error("totalClicks missing");
  });

  await test("analytics.getStats() with period=7d", async () => {
    if (!shortCode) throw new Error("no shortCode");
    const stats = await client.analytics.getStats(shortCode, "7d");
    if (typeof stats.totalClicks !== "number") throw new Error("totalClicks missing");
  });

  // ─── QR ──────────────────────────────────────────────────────────────────
  console.log("\n── QR ──");
  await test("qr.getUrl() returns a valid URL", async () => {
    const url = client.qr.getUrl("abc123", { size: 256 });
    new URL(url); // throws if invalid
    if (!url.includes("abc123")) throw new Error("shortCode not in URL");
  });

  // ─── Folders ─────────────────────────────────────────────────────────────
  console.log("\n── Folders ──");
  let folderId = "";
  await test("folders.create() + list() + delete()", async () => {
    const folder = await client.folders.create({ name: `integration-test-${Date.now()}` });
    if (!folder.id) throw new Error("folder.id missing");
    folderId = folder.id;

    const folders = await client.folders.list();
    const found = folders.find((f) => f.id === folderId);
    if (!found) throw new Error("created folder not in list");

    await client.folders.delete(folderId);
  });

  // ─── Namespace ───────────────────────────────────────────────────────────
  console.log("\n── Namespace ──");
  await test("namespace.get() returns NamespaceInfo", async () => {
    const ns = await client.namespace.get();
    if (typeof ns.hasAccess !== "boolean") throw new Error("hasAccess missing");
    if (!ns.tier) throw new Error("tier missing");
  });

  await test("namespace.check() returns availability result", async () => {
    const result = await client.namespace.check(`testns${Date.now()}`);
    if (typeof result.available !== "boolean") throw new Error("available missing");
  });

  // ─── Webhooks ────────────────────────────────────────────────────────────
  console.log("\n── Webhooks ──");
  await test("webhooks.listEventTypes() returns eventTypes array", async () => {
    try {
      const { eventTypes } = await client.webhooks.listEventTypes();
      if (!Array.isArray(eventTypes)) throw new Error("eventTypes is not an array");
    } catch (err) {
      if (err instanceof AwsysError && (err.status === 403 || err.status === 401)) {
        console.log("     (skipped — requires higher tier)");
        return;
      }
      throw err;
    }
  });

  await test("webhooks.list() returns webhooks list", async () => {
    try {
      const { webhooks } = await client.webhooks.list();
      if (!Array.isArray(webhooks)) throw new Error("webhooks is not an array");
    } catch (err) {
      if (err instanceof AwsysError && (err.status === 403 || err.status === 401)) {
        console.log("     (skipped — requires higher tier)");
        return;
      }
      throw err;
    }
  });

  // ─── Trust score ─────────────────────────────────────────────────────────
  console.log("\n── Trust Score ──");
  await test("trustScore.scan() returns a result", async () => {
    if (!shortCode) throw new Error("no shortCode");
    const result = await client.trustScore.scan(shortCode);
    if (!result.short) throw new Error("short missing");
    if (!result.long) throw new Error("long missing");
  });

  // ─── UTM Templates ───────────────────────────────────────────────────────
  console.log("\n── UTM Templates ──");
  await test("utmTemplates.list() returns array", async () => {
    const templates = await client.utmTemplates.list();
    if (!Array.isArray(templates)) throw new Error("not an array");
  });

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
