/**
 * Basic usage examples for the @awsysco/sdk
 *
 * Run with: npx tsx examples/basic-usage.ts
 */

import {
  AwsysClient,
  AwsysError,
  AwsysNotFoundError,
  AwsysRateLimitError,
} from "../src/index.js";

const client = new AwsysClient({
  apiKey: process.env.AWSYS_API_KEY ?? "awsys_your_key_here",
  baseUrl: process.env.AWSYS_BASE_URL, // defaults to https://awsys.co
});

async function main() {
  // ─── Create a short link ──────────────────────────────────────────────
  console.log("Creating a short link...");
  const link = await client.links.create({
    url: "https://example.com/my-long-url",
  });
  console.log("Created:", link.shortUrl);
  console.log("Short code:", link.shortCode);

  // ─── Create with options ──────────────────────────────────────────────
  const expiringLink = await client.links.create({
    url: "https://example.com/limited-offer",
    maxClicks: 100,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
  });
  console.log("Expiring link:", expiringLink.shortUrl);

  // ─── List links ───────────────────────────────────────────────────────
  console.log("\nListing links...");
  const { data: links, total, hasMore } = await client.links.list({ limit: 10 });
  console.log(`Found ${total} links (showing ${links.length}, hasMore: ${hasMore})`);
  links.forEach((l) => console.log(`  - ${l.fullPath}: ${l.long}`));

  // ─── Get analytics ────────────────────────────────────────────────────
  console.log("\nGetting stats...");
  const stats = await client.analytics.getStats(link.shortCode);
  console.log(`${link.shortCode}: ${stats.totalClicks} clicks`);

  // ─── Generate QR code URL ─────────────────────────────────────────────
  const qrUrl = client.qr.getUrl(link.shortCode, { size: 256, color: "000000" });
  console.log("\nQR code URL:", qrUrl);

  // ─── Folders ─────────────────────────────────────────────────────────
  console.log("\nCreating a folder...");
  const folder = await client.folders.create({ name: "My Campaign", color: "3b82f6" });
  console.log("Folder created:", folder.id, folder.name);

  // Assign link to folder
  await client.folders.assignLink(link.shortCode, folder.id);
  console.log("Link assigned to folder");

  // Remove link from folder
  await client.folders.removeLink(link.shortCode);
  console.log("Link removed from folder");

  // List folders
  const folders = await client.folders.list();
  console.log("Folders:", folders.map((f) => f.name).join(", "));

  // Delete folder
  await client.folders.delete(folder.id);
  console.log("Folder deleted");

  // ─── Me ───────────────────────────────────────────────────────────────
  const me = await client.me.get();
  console.log("\nAuthenticated as:", me.email);
  console.log("Plan:", me.subscriptionTier);
  if (me.limits) {
    console.log("API calls/month:", me.limits.apiCallsPerMonth ?? "unlimited");
  }

  // ─── Error handling ───────────────────────────────────────────────────
  console.log("\nError handling example...");
  try {
    await client.analytics.getStats("this-does-not-exist");
  } catch (err) {
    if (err instanceof AwsysNotFoundError) {
      console.log("Not found:", err.message);
    } else if (err instanceof AwsysRateLimitError) {
      console.log("Rate limited. Retry after:", err.retryAfter, "seconds");
    } else if (err instanceof AwsysError) {
      console.log(`API error [${err.status}]:`, err.message, `(code: ${err.code})`);
    } else {
      throw err;
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
