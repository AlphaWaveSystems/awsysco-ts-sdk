/**
 * Basic usage example for @awsysco/sdk
 *
 * Run with: npx tsx examples/basic.ts
 * Requires: AWSYS_API_KEY environment variable
 */

import { AwsysClient } from "../src/index.js";

const client = new AwsysClient({ apiKey: process.env.AWSYS_API_KEY! });

async function main() {
  // Create a link
  const link = await client.links.create({ url: "https://example.com" });
  console.log("Created:", link.shortUrl);

  // List links
  const { data } = await client.links.list({ limit: 5 });
  console.log("Links:", data.length);

  // Get analytics
  const stats = await client.analytics.getStats(link.shortCode);
  console.log("Clicks:", stats.totalClicks);

  // Check namespace
  const ns = await client.namespace.get();
  console.log("Namespace:", ns.namespace);

  // List webhooks
  const { webhooks } = await client.webhooks.list();
  console.log("Webhooks:", webhooks.length);
}

main().catch(console.error);
