# @awsysco/sdk

![npm version](https://img.shields.io/npm/v/@awsysco/sdk)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue)
![License](https://img.shields.io/npm/l/@awsysco/sdk)

Official TypeScript/Node.js SDK for the [AWSYS.CO](https://awsys.co) URL Shortener API. Zero
runtime dependencies — built on the native `fetch`/`AbortController` available in Node 18+.

**Table of contents:** [Requirements](#requirements) · [Installation](#installation) ·
[Quick Start](#quick-start) · [Authentication & Configuration](#authentication--configuration) ·
[Error Handling](#error-handling) · [Retry & Rate Limiting](#retry--rate-limiting) ·
[Pagination](#pagination) · [API Reference](#api-reference) · [Examples](#examples) ·
[Security](#security) · [Contributing](#contributing) · [Supported Node Versions](#supported-node-versions) ·
[License & Changelog](#license--changelog)

## Requirements

- Node.js 18 or higher (uses built-in `fetch`/`AbortController`) — see [Supported Node Versions](#supported-node-versions)
- An AWSYS.CO account on the Pro plan or higher
- An API key (generated in your [dashboard settings](https://awsys.co/dashboard/settings))

## Installation

```bash
npm install @awsysco/sdk
```

## Quick Start

```typescript
import { AwsysClient } from "@awsysco/sdk";

const client = new AwsysClient({
  apiKey: "awsys_your_key_here",
});

// Create a short link
const link = await client.links.create({ url: "https://example.com" });
console.log(link.shortUrl); // https://awsys.co/abc123
```

See [`examples/`](./examples) for fuller, runnable scripts.

## Authentication & Configuration

API keys are sent via `Authorization: Bearer <key>` automatically. Generate your key in the
AWSYS.CO dashboard under Settings → API Keys. API key access requires a Pro plan or higher —
free tier accounts cannot use the API.

```typescript
const client = new AwsysClient({
  apiKey: "awsys_...",          // Falls back to process.env.AWSYS_API_KEY if omitted.
                                 // Missing both → AwsysConfigurationError, thrown before any request.
  baseUrl: "https://awsys.co",  // Falls back to process.env.AWSYS_BASE_URL, then this default.
                                 // Must be http(s) — any other scheme → AwsysConfigurationError.
  timeoutMs: 30000,             // Per-request timeout (AbortController-based). Default 30000.
  maxRetries: 3,                // Max retry attempts. 0 disables retries entirely.
});
```

A `User-Agent: awsysco-ts-sdk/<version> (node/<runtime>)` header is sent on every request, with
`<version>` matching this package's published version.

`timeoutMs` can also be overridden per call:

```typescript
await client.links.get("abc123", { timeoutMs: 5000 });
```

**Redaction:** the client and every thrown error implement `toJSON()` and
`util.inspect.custom` so the raw API key never appears in `JSON.stringify(client)`,
`console.log(client)`, or an error's own serialized form — see [Security](#security).

## Error Handling

All API errors throw a typed error class, all extending the base `AwsysError`:

| Error Class               | HTTP Status         | When thrown                                          |
|---------------------------|----------------------|-------------------------------------------------------|
| `AwsysConfigurationError` | –                    | Missing API key, or an invalid `baseUrl` scheme       |
| `AwsysValidationError`    | 400                  | Invalid request payload                               |
| `AwsysAuthError`          | 401                  | Missing, invalid, revoked, or free-tier API key       |
| `AwsysForbiddenError`     | 403                  | Insufficient tier, feature flag off, or a deprecated Firebase-only endpoint (e.g. `customDomains.activate()`) |
| `AwsysNotFoundError`      | 404                  | Resource does not exist                               |
| `AwsysConflictError`      | 409                  | Conflict (e.g. custom slug already taken)             |
| `AwsysRateLimitError`     | 429                  | Rate limit exceeded (per-route or per-quota)          |
| `AwsysServerError`        | 5xx                  | Server-side error                                     |
| `AwsysNetworkError`       | – (transport)        | Connection reset/refused, DNS failure, etc.           |
| `AwsysTimeoutError`       | – (extends `AwsysNetworkError`) | Request aborted after `timeoutMs`          |

Every error has `message`, `code` (machine-readable, from the API where available), `status`
(HTTP status, when there is one), and `raw` (the parsed or raw response body). The SDK tolerates
every response-body shape the platform actually sends — `{error:true,code,message}`,
`{error:"<string>",code}`, `{error:true,code}` with no message, `{success:false,message,code}`,
non-JSON bodies (including HTML error pages), and missing bodies — so a body-shape surprise never
throws an unrelated JS error in place of a typed one.

`AwsysRateLimitError` additionally has `retryAfter` (seconds, if provided by the server), `code`
(e.g. `HOURLY_LIMIT_EXCEEDED`, `MONTHLY_LIMIT_EXCEEDED`, `DAILY_LIMIT_EXCEEDED`), and `resetsAt`
(when the platform provides it).

```typescript
import {
  AwsysError,
  AwsysNotFoundError,
  AwsysRateLimitError,
  AwsysTimeoutError,
} from "@awsysco/sdk";

try {
  const link = await client.links.get("abc123");
} catch (err) {
  if (err instanceof AwsysNotFoundError) {
    console.log("Link not found");
  } else if (err instanceof AwsysRateLimitError) {
    console.log(`Rate limited. Retry in ${err.retryAfter}s (code: ${err.code})`);
  } else if (err instanceof AwsysTimeoutError) {
    console.log("Request timed out");
  } else if (err instanceof AwsysError) {
    console.log(`API error [${err.status}] ${err.code}: ${err.message}`);
  }
}
```

## Retry & Rate Limiting

The SDK retries automatically:

- **`429`** is retried for **every** HTTP method — *except* quota-class 429s
  (`HOURLY_LIMIT_EXCEEDED` / `DAILY_LIMIT_EXCEEDED` / `MONTHLY_LIMIT_EXCEEDED`), which raise
  `AwsysRateLimitError` immediately since waiting a few seconds cannot help.
- **`502`/`503`/`504`** and transport-level network errors are retried **only** for idempotent
  methods (`GET`, `PUT`, `DELETE`) — never for `POST`/`PATCH`, since the platform has no
  idempotency keys and a retried write could create a duplicate.
- Backoff uses the `Retry-After` header when present (seconds or an HTTP-date), otherwise
  exponential backoff (`1s × 2^attempt`, capped at 30s) with full jitter.
- Up to 3 retries (4 attempts total) by default.

```typescript
const client = new AwsysClient({
  apiKey: "awsys_...",
  maxRetries: 5, // retry up to 5 times; 0 disables retries entirely
});
```

Rate limits depend on your plan (no `X-RateLimit-*` response headers are sent — check
`AwsysRateLimitError`'s `code`/`resetsAt` instead):

| Plan       | Hourly limit  | Monthly limit    |
|------------|---------------|------------------|
| Pro        | 50 calls      | 1,000 calls      |
| Builder    | 500 calls     | 10,000 calls     |
| Developer  | 1,000 calls   | 50,000 calls     |
| Agency     | 5,000 calls   | 250,000 calls    |
| Enterprise | 20,000 calls  | 1,000,000 calls  |

## Pagination

`client.links.list(opts?)` returns `{ data, limit, offset, hasMore }` (`total` is present on the
type for compatibility but is always `undefined` as of 1.4.0 — see [CHANGELOG](./CHANGELOG.md)).
`limit` is clamped to 100 client-side.

For iterating every link without manually paging, use `listAll()`:

```typescript
for await (const link of client.links.listAll({ limit: 100 })) {
  console.log(link.shortCode);
}
```

`listAll()` stops when `hasMore` is `false` or a page returns fewer than `limit` items
(guarding against a response that omits `hasMore`). No other resource's `list()` paginates —
folders, webhooks, saved views, domains, affiliate programs, and import jobs are unpaginated (or
`limit`-only) by platform design.

## API Reference

### Client Configuration

See [Authentication & Configuration](#authentication--configuration).

### Links

#### `client.links.create(opts)`

Create a shortened link.

| Parameter    | Type     | Required | Description                            |
|-------------|----------|----------|-----------------------------------------|
| `url`       | `string` | Yes      | The destination URL                    |
| `customSlug`| `string` | No       | Custom slug (Pro+ required)            |
| `expiresAt` | `string` | No       | ISO 8601 expiry date-time              |
| `maxClicks` | `number` | No       | Max clicks before link expires         |

Returns: `CreatedLink`

```typescript
const link = await client.links.create({
  url: "https://example.com/my-page",
  maxClicks: 100,
  expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
});
```

#### `client.links.list(opts?)` / `client.links.listAll(opts?)`

List links, or iterate every link automatically — see [Pagination](#pagination).

```typescript
const { data, hasMore } = await client.links.list({ limit: 20, offset: 0 });
```

#### `client.links.get(shortPath)`

Get a single link by its short code (or namespaced `prefix/slug` path).

```typescript
const link = await client.links.get("abc123");
```

#### `client.links.update(shortPath, opts)`

Update a link's expiry or click limit.

```typescript
const updated = await client.links.update("abc123", { maxClicks: 500 });
```

#### `client.links.delete(shortPath)`

Delete a link permanently.

```typescript
await client.links.delete("abc123");
```

---

### Analytics

#### `client.analytics.getStats(shortPath)`

Get click statistics for a link. Returns: `LinkStats`.

```typescript
const stats = await client.analytics.getStats("abc123");
console.log(stats.totalClicks);
console.log(stats.clicks); // Array of click events with timestamp, country, device
```

#### `client.analytics.getAggregateStats(shortPath, opts?)`

Get rich aggregated analytics for a link over a time window
(`GET /api/v1/links/:shortPath/stats/aggregate`).

```typescript
const agg = await client.analytics.getAggregateStats("abc123", { period: "30d" });
console.log(agg.totalClicks, agg.uniqueVisitors);
```

#### `client.analytics.getRecentClicks(opts?)`

Get the authenticated user's most recent clicks across all links
(`GET /api/user/clicks/recent`).

```typescript
const recent = await client.analytics.getRecentClicks({ limit: 20, since: "2026-09-01T00:00:00.000Z" });
```

> This route is behind a per-account feature flag ("Live Globe"). If it's off for your account,
> it throws `AwsysForbiddenError` with `code: "FEATURE_DISABLED"`.

---

### QR Codes

#### `client.qr.getUrl(shortCode, opts?)`

Returns the URL for a QR code image — built locally, no network request.

```typescript
const qrUrl = client.qr.getUrl("abc123", { size: 256, color: "000000" });
// Use as: <img src={qrUrl} />
```

#### `client.qr.getSettings(shortPath)` / `client.qr.updateSettings(shortPath, settings)`

```typescript
const settings = await client.qr.getSettings("abc123");
await client.qr.updateSettings("abc123", { color: "#ff0000" });
```

---

### Folders

```typescript
const folders = await client.folders.list();
const folder = await client.folders.create({ name: "Q4 Campaign", color: "ef4444" });
await client.folders.assignLink("abc123", folder.id);
await client.folders.removeLink("abc123");
await client.folders.delete(folder.id);
```

---

### Tags

```typescript
await client.tags.add("abc123", ["launch", "social"]); // also accepts a single string
await client.tags.remove("abc123", "social");
```

---

### Saved Views

```typescript
const { views } = await client.savedViews.list();
const view = await client.savedViews.create({ name: "Active launch links", filters: { status: "active", tag: "launch" } });
await client.savedViews.update(view.id, { name: "Renamed view" });
await client.savedViews.delete(view.id);
```

---

### UTM Templates

No dedicated list route exists on the platform — `list()` derives templates from `/api/v1/me`.

```typescript
const templates = await client.utmTemplates.list();
const template = await client.utmTemplates.create({
  name: "Newsletter CTA",
  utmSource: "newsletter",
  utmMedium: "email",
  utmCampaign: "weekly-digest",
});
await client.utmTemplates.delete(template.id);
```

---

### Webhooks

```typescript
const { eventTypes } = await client.webhooks.listEventTypes();
const { webhooks } = await client.webhooks.list();
const webhook = await client.webhooks.create({ url: "https://you.example.com/hook", events: ["link.created"] });
await client.webhooks.update(webhook.id, { enabled: false });
await client.webhooks.test(webhook.id, "link.created");
await client.webhooks.delete(webhook.id);
```

> Legacy webhook docs on the platform can lack `enabled`/`secret` — every `Webhook` field except
> `id`/`url`/`events` is optional; treat an absent `enabled` as unknown, not `false`.

---

### Custom Domains

```typescript
const { domains } = await client.customDomains.list();
await client.customDomains.add("links.yourdomain.com");
await client.customDomains.verify("links.yourdomain.com");
await client.customDomains.update("links.yourdomain.com", { defaultRedirect: "https://example.com/" });
await client.customDomains.remove("links.yourdomain.com");
const check = await client.customDomains.check("links.yourdomain.com");
```

> `client.customDomains.activate()` is **deprecated** — it requires Firebase-session auth and is
> not reachable with an API key. It now throws `AwsysForbiddenError` instead of making a network
> call; activate domains from the dashboard. Removed entirely in the next major version.

---

### Namespace

```typescript
const ns = await client.namespace.get();
const availability = await client.namespace.check("mynamespace");
await client.namespace.claim("mynamespace");
await client.namespace.release();
```

---

### Affiliate

```typescript
const program = await client.affiliate.createProgram({ name: "My Program", commissionRate: 10 });
const programs = await client.affiliate.listPrograms();
await client.affiliate.updateProgram(program.id, { name: "Renamed" });
const stats = await client.affiliate.getProgramStats(program.id, "30d");
const partners = await client.affiliate.listPartners(program.id);
await client.affiliate.updatePartnerStatus(program.id, partners[0].id, "approved");
const discovered = await client.affiliate.discover(20);
await client.affiliate.join(discovered[0].id, "REFCODE");
const partnerships = await client.affiliate.listPartnerships();
await client.affiliate.leaveProgram(partnerships[0].id);
const limits = await client.affiliate.getLimits();
```

---

### AgentLink

```typescript
await client.agentlink.subscribe("you@example.com"); // public endpoint
const linkStats = await client.agentlink.getLinkStats("abc123", 30);
const accountStats = await client.agentlink.getAccountStats(30);
```

---

### Bulk

Requires Builder tier or higher.

```typescript
const result = await client.bulk.create({
  urls: [
    { url: "https://example.com/page-1" },
    { url: "https://example.com/page-2", maxClicks: 50 },
  ],
});
```

---

### Me

```typescript
const me = await client.me.get();
console.log(me.subscriptionTier); // "pro", "builder", "enterprise", etc.
```

---

### Profile

Distinct from `client.me.get()` (static plan info) — the user's editable profile.

```typescript
const profile = await client.profile.get();
await client.profile.update({ displayName: "New Name" });
```

---

### Usage

Live consumption stats — distinct from `client.me.get()`'s static plan limits.

```typescript
const usage = await client.usage.get();
console.log(usage.linksCreatedToday, usage.apiCallsThisMonth, usage.overage);
```

---

### Web2App

```typescript
const session = await client.web2app.consumeSession("tok_abc123"); // single-use, 24h TTL
```

---

### Imports

Migrate links from an external provider (e.g. Bitly). Requires a paid tier.

```typescript
const job = await client.imports.start({ provider: "bitly", accessToken: "...", scanOnly: true });
const status = await client.imports.getStatus(job.id);
const jobs = await client.imports.list({ limit: 10 });
await client.imports.cancel(job.id);
const finished = await client.imports.waitForCompletion(job.id, { pollIntervalMs: 3000, timeoutMs: 300000 });
const csv = await client.imports.getRedirectMapCsv(job.id);
const json = await client.imports.getRedirectMapJson(job.id);
```

---

### Export

```typescript
const linksCsv = await client.dataExport.exportLinks();
const statsCsv = await client.dataExport.exportLinkStats("abc123");
```

---

### Trust Score

```typescript
const scan = await client.trustScore.scan("abc123"); // public endpoint
console.log(scan.trustScore, scan.trustStatus, scan.threats);
```

## Examples

Runnable scripts in [`examples/`](./examples):

- [`basic.ts`](./examples/basic.ts) — minimal quick-start (links, analytics, namespace, webhooks)
- [`advanced.ts`](./examples/advanced.ts) — folders, QR, `listAll()`, webhooks, custom domains,
  affiliate, saved views, UTM templates, trust score, namespace, profile, full error handling
- [`integration.ts`](./examples/integration.ts) — a manual smoke-test script exercising the main
  happy paths against a live API (not wired into `npm test`)

## Security

- The API key is never logged and never appears in `JSON.stringify`/`util.inspect` output of the
  client or of any thrown error — see `SECURITY-REVIEW.md` for what's covered by tests and known
  gaps.
- TLS verification is never disabled — there is no SDK option to turn it off (plain `fetch`).
- `baseUrl` must be `http://` or `https://`; anything else throws `AwsysConfigurationError` before
  any request is made.
- Zero runtime dependencies.

Full findings: [`SECURITY-REVIEW.md`](./SECURITY-REVIEW.md).

## Contributing

### Environment Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.test` and add your staging API key:
   ```bash
   cp .env.example .env.test
   ```
4. Run tests: `npm test`
5. Build: `npm run build`

### Development Commands

```bash
npm run build        # Compile with tsup (CJS + ESM + .d.ts)
npm test              # Unit + contract-fixture tests (offline) + integration tests (skipped without AWSYS_API_KEY)
npm run test:watch   # Watch mode
npm run typecheck    # Type-check without emitting
npm run lint         # ESLint (typescript-eslint, type-checked)
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests, build, and a pack+install smoke test
on every push/PR across Node 18/20/22. `.github/workflows/contract-drift.yml` checks this SDK
against the platform's `sdk-contract.json` on a schedule and whenever the platform repo dispatches
a contract-changed event.

### Test Architecture

Two layers: **contract-fixture tests** (`tests/contracts/`, offline, mocked `fetch`, driven by a
vendored copy of the platform's `sdk-contract.json` — every capability/error/behavior scenario is
asserted, method-by-method) and **integration tests** (the rest of `tests/`, gated behind
`AWSYS_API_KEY` — skip cleanly when it's unset, run against real staging when it's present). Never
commit `.env.test`.

## Supported Node Versions

Node 18, 20, and 22 (CI matrix). Node 18 reached end-of-life in April 2025 and is kept for 1.4.0
compatibility only — expect the next major version to raise the minimum.

## License & Changelog

MIT — see [LICENSE](LICENSE) for details. Release history: [CHANGELOG.md](./CHANGELOG.md).

&copy; 2026 Alpha Wave Systems
