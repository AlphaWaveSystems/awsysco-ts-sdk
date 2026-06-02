/**
 * Advanced usage example for @awsysco/sdk
 *
 * Demonstrates: advanced link creation, webhooks, custom domains,
 * affiliate programs, saved views, and UTM templates.
 *
 * Run with: npx tsx examples/advanced.ts
 * Requires: AWSYS_API_KEY environment variable
 */

import { AwsysClient, AwsysError } from "../src/index.js";

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
  console.log("Webhook created:", webhook.id);

  // Clean up webhook
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
      description: "Earn commissions by referring users",
      commissionType: "cpc",
      cpcRate: 0.05,
      cookieDays: 30,
    });
    console.log("Program created:", program.id);

    // Discover public programs
    const publicPrograms = await client.affiliate.discover(5);
    console.log("Public programs:", publicPrograms.length);

    // Clean up
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

    // Update the view
    await client.savedViews.update(view.id, { name: "Launch campaign links" });
    console.log("View renamed");

    // Clean up
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
    const { template } = await client.utmTemplates.create({
      name: "Newsletter CTA",
      source: "newsletter",
      medium: "email",
      campaign: "weekly-digest",
      content: "cta-button",
    });
    console.log("Template created:", template.id);

    // List templates
    const templates = await client.utmTemplates.list();
    console.log("UTM templates:", templates.length);

    // Clean up
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
  console.log(`Trust score for ${scan.short}: ${scan.score ?? "not yet scanned"} (${scan.status})`);

  // ─── Namespace ───────────────────────────────────────────────────────────
  console.log("\nChecking namespace...");
  const nsInfo = await client.namespace.get();
  console.log("Namespace:", nsInfo.namespace ?? "none", "| Tier:", nsInfo.tier);

  if (!nsInfo.namespace) {
    const availability = await client.namespace.check("mynamespace");
    console.log("'mynamespace' available:", availability.available);
  }

  console.log("\nAll done!");
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
