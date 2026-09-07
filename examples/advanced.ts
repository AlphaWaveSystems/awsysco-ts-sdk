/**
 * Advanced usage example for @awsysco/sdk
 *
 * Demonstrates: advanced link creation, folders, QR codes, webhooks,
 * custom domains, affiliate programs, saved views, UTM templates, profile,
 * auto-pagination, and full error-class handling.
 *
 * Run with: npx tsx examples/advanced.ts
 * Requires: AWSYS_API_KEY environment variable
 */

import {
  AwsysClient,
  AwsysError,
  AwsysNotFoundError,
  AwsysRateLimitError,
} from "../src/index.js";

const client = new AwsysClient({ apiKey: process.env.AWSYS_API_KEY! });

async function main() {
  // ─── Advanced link creation ───────────────────────────────────────────────
  console.log("Creating advanced link with routing rules and OG meta...");
  const link = await client.links.create({
    url: "https://example.com/product",
    routingRules: [
      { country: "GB", redirectUrl: "https://example.co.uk/product" },
      { country: "DE", redirectUrl: "https://example.de/produkt" },
    ],
    ogMeta: {
      title: "Check out this product",
      description: "The best product you have ever seen",
      image: "https://example.com/og-image.png",
    },
    geoRestriction: {
      blockedCountries: ["KP", "IR"],
    },
    tags: ["launch", "product"],
    passAdClickIds: true,
  });
  console.log("Created link:", link.shortUrl, "| short code:", link.shortCode);

  // ─── Folders ───────────────────────────────────────────────────────────
  console.log("\nCreating a folder...");
  const folder = await client.folders.create({ name: "My Campaign", color: "3b82f6" });
  console.log("Folder created:", folder.id, folder.name);

  await client.folders.assignLink(link.shortCode, folder.id);
  console.log("Link assigned to folder");

  await client.folders.removeLink(link.shortCode);
  console.log("Link removed from folder");

  const folders = await client.folders.list();
  console.log("Folders:", folders.map((f) => f.name).join(", "));

  await client.folders.delete(folder.id);
  console.log("Folder deleted");

  // ─── QR codes ────────────────────────────────────────────────────────────
  const qrUrl = client.qr.getUrl(link.shortCode, { size: 256, color: "000000" });
  console.log("\nQR code URL:", qrUrl);

  // ─── Auto-pagination ─────────────────────────────────────────────────────
  console.log("\nIterating all links with listAll()...");
  let seen = 0;
  for await (const _link of client.links.listAll({ limit: 20 })) {
    seen += 1;
    if (seen > 100) break; // demo safety net — don't page through a huge account
  }
  console.log(`Iterated ${seen} link(s) across as many pages as needed.`);

  // ─── Webhooks ────────────────────────────────────────────────────────────
  console.log("\nListing webhook event types...");
  const { eventTypes } = await client.webhooks.listEventTypes();
  console.log("Available events:", eventTypes.slice(0, 3).join(", "), "...");

  console.log("Creating a webhook...");
  const webhook = await client.webhooks.create({
    url: "https://your-server.example.com/webhooks/awsys",
    events: ["link.created", "link.click"],
    name: "My webhook",
    secret: "super-secret-value",
  });
  console.log("Webhook created:", webhook.id, "| enabled:", webhook.enabled ?? "(unknown — legacy doc)");

  await client.webhooks.delete(webhook.id);
  console.log("Webhook deleted");

  // ─── Custom domains ──────────────────────────────────────────────────────
  console.log("\nChecking domain availability...");
  const check = await client.customDomains.check("links.yourdomain.com");
  console.log("links.yourdomain.com available:", check.available);

  console.log("Listing existing custom domains...");
  const { domains } = await client.customDomains.list();
  console.log("Custom domains:", domains.length);

  // ─── Affiliate programs ──────────────────────────────────────────────────
  console.log("\nCreating an affiliate program...");
  try {
    const program = await client.affiliate.createProgram({
      name: "My Affiliate Program",
      commissionRate: 10,
      cookieDays: 30,
    });
    console.log("Program created:", program.id);

    const publicPrograms = await client.affiliate.discover(5);
    console.log("Public programs:", publicPrograms.length);

    // (programs don't have a delete endpoint — just leave it for demo purposes)
  } catch (err) {
    if (err instanceof AwsysError) {
      console.log("Affiliate error (may require higher tier):", err.message);
    }
  }

  // ─── Saved views ─────────────────────────────────────────────────────────
  console.log("\nCreating a saved view...");
  try {
    const view = await client.savedViews.create({
      name: "Active links in campaign folder",
      filters: {
        status: "active",
        tag: "launch",
      },
    });
    console.log("View created:", view.id, view.name);

    await client.savedViews.update(view.id, { name: "Launch campaign links" });
    console.log("View renamed");

    await client.savedViews.delete(view.id);
    console.log("View deleted");
  } catch (err) {
    if (err instanceof AwsysError) {
      console.log("Saved views error (may require Pro tier):", err.message);
    }
  }

  // ─── UTM templates ───────────────────────────────────────────────────────
  console.log("\nCreating a UTM template...");
  try {
    const template = await client.utmTemplates.create({
      name: "Newsletter CTA",
      utmSource: "newsletter",
      utmMedium: "email",
      utmCampaign: "weekly-digest",
      content: "cta-button",
    });
    console.log("Template created:", template.id);

    const templates = await client.utmTemplates.list();
    console.log("UTM templates:", templates.length);

    await client.utmTemplates.delete(template.id);
    console.log("Template deleted");
  } catch (err) {
    if (err instanceof AwsysError) {
      console.log("UTM template error:", err.message);
    }
  }

  // ─── Trust score ─────────────────────────────────────────────────────────
  console.log("\nScanning link trust score...");
  const scan = await client.trustScore.scan(link.shortCode);
  console.log(
    `Trust score for ${scan.shortCode ?? link.shortCode}: ${scan.trustScore ?? "not yet scanned"} (${scan.trustStatus})`,
  );

  // ─── Namespace ───────────────────────────────────────────────────────────
  console.log("\nChecking namespace...");
  const nsInfo = await client.namespace.get();
  console.log("Namespace:", nsInfo.namespace ?? "none", "| Tier:", nsInfo.tier);

  if (!nsInfo.namespace) {
    const availability = await client.namespace.check("mynamespace");
    console.log("'mynamespace' available:", availability.available);
  }

  // ─── Profile ─────────────────────────────────────────────────────────────
  console.log("\nFetching profile...");
  const profile = await client.profile.get();
  console.log("Profile:", profile.email, "| display name:", profile.displayName ?? "(none)");
  await client.profile.update({ displayName: "New Display Name" });
  console.log("Profile updated");

  // ─── Error handling ───────────────────────────────────────────────────────
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

  console.log("\nAll done!");
}

main().catch((err: unknown) => {
  console.error("Fatal error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
