# @awsysco/sdk

![npm version](https://img.shields.io/npm/v/@awsysco/sdk)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue)
![License](https://img.shields.io/npm/l/@awsysco/sdk)

Official TypeScript/Node.js SDK for the [AWSYS.CO](https://awsys.co) URL Shortener API.

## Requirements

- Node.js 18 or higher (uses built-in `fetch`)
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

## Authentication

API keys are passed via the `Authorization: Bearer` header automatically. Generate your key in the AWSYS.CO dashboard under Settings → API Keys.

API key access requires a Pro plan or higher. Free tier accounts cannot use the API.

## API Reference

### Client Configuration

```typescript
const client = new AwsysClient({
  apiKey: "awsys_...",        // Required
  baseUrl: "https://awsys.co", // Optional, defaults to https://awsys.co
  maxRetries: 3,               // Optional, max retries on 429 (default: 3)
});
```

### Links

#### `client.links.create(opts)`

Create a shortened link.

| Parameter    | Type     | Required | Description                            |
|-------------|----------|----------|----------------------------------------|
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

#### `client.links.list(opts?)`

List all links for the authenticated user.

| Parameter | Type     | Required | Description       |
|-----------|----------|----------|-------------------|
| `limit`   | `number` | No       | Max results       |
| `offset`  | `number` | No       | Results to skip   |

Returns: `PaginatedResponse<Link>`

```typescript
const { data, total, hasMore } = await client.links.list({ limit: 20, offset: 0 });
```

#### `client.links.get(shortPath)`

Get a single link by its short code.

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

Get click statistics for a link.

Returns: `LinkStats`

```typescript
const stats = await client.analytics.getStats("abc123");
console.log(stats.totalClicks);
console.log(stats.clicks); // Array of click events with timestamp, country, device
```

---

### QR Codes

#### `client.qr.getUrl(shortCode, opts?)`

Returns the URL for a QR code image. This method builds the URL without making a network request — use the returned URL as an `<img src>`.

| Parameter | Type     | Required | Description                        |
|-----------|----------|----------|------------------------------------|
| `size`    | `number` | No       | Image size in pixels (square)      |
| `color`   | `string` | No       | Foreground color hex (without `#`) |
| `bgColor` | `string` | No       | Background color hex (without `#`) |

Returns: `string` (URL)

```typescript
const qrUrl = client.qr.getUrl("abc123", { size: 256, color: "000000" });
// Use as: <img src={qrUrl} />
```

---

### Folders

#### `client.folders.list()`

List all folders.

```typescript
const folders = await client.folders.list();
```

#### `client.folders.create(opts)`

Create a new folder.

| Parameter | Type     | Required | Description               |
|-----------|----------|----------|---------------------------|
| `name`    | `string` | Yes      | Folder name               |
| `color`   | `string` | No       | Hex color (without `#`)   |

```typescript
const folder = await client.folders.create({ name: "Q4 Campaign", color: "ef4444" });
```

#### `client.folders.delete(folderId)`

Delete a folder.

```typescript
await client.folders.delete(folder.id);
```

#### `client.folders.assignLink(shortPath, folderId)`

Assign a link to a folder.

```typescript
await client.folders.assignLink("abc123", folder.id);
```

#### `client.folders.removeLink(shortPath)`

Remove a link from its current folder.

```typescript
await client.folders.removeLink("abc123");
```

---

### Bulk

#### `client.bulk.create(opts)`

Create multiple links in a single request. Requires Builder tier or higher.

```typescript
const result = await client.bulk.create({
  urls: [
    { url: "https://example.com/page-1" },
    { url: "https://example.com/page-2", maxClicks: 50 },
    { url: "https://example.com/page-3", customSlug: "my-page-3" },
  ],
});
console.log(result.created); // number of successfully created links
```

---

### Me

#### `client.me.get()`

Get the authenticated user's profile and plan information.

```typescript
const me = await client.me.get();
console.log(me.email);
console.log(me.subscriptionTier); // "pro", "builder", "enterprise", etc.
console.log(me.limits?.apiCallsPerMonth);
```

---

### Usage

#### `client.usage.get()`

Get the authenticated user's **live consumption** stats — current usage against
plan limits (links/clicks/QR codes/API calls used this period, overage state).
This is distinct from `client.me.get()`, which returns the static profile and
plan limits rather than live consumption.

```typescript
const usage = await client.usage.get();
console.log(usage.totalLinks);              // links created all-time
console.log(usage.linksCreatedThisMonth);   // usage this billing period
console.log(usage.trackedClicksThisMonth);
console.log(usage.limits.monthlyTrackedClicks); // number | "unlimited"
console.log(usage.overage.active);          // overage billing state
```

---

### Web2App

#### `client.web2app.consumeSession(token)`

Consume a web-to-app deferred-deep-link session by its token. The token is
**single-use** (consumed on read) and has a **24-hour TTL**.

```typescript
const session = await client.web2app.consumeSession("tok_abc123");
console.log(session.linkId);
console.log(session.utmParams);    // Record<string, string>
console.log(session.routingRule);  // Record<string, unknown> | null
console.log(session.country);      // resolved click country, or null
```

A missing or expired token throws `AwsysNotFoundError`; a malformed token
throws `AwsysValidationError`.

---

## Error Handling

All API errors throw a typed error class:

| Error Class             | HTTP Status | When thrown                              |
|------------------------|-------------|------------------------------------------|
| `AwsysValidationError`  | 400         | Invalid request payload                  |
| `AwsysAuthError`        | 401         | Missing or invalid API key               |
| `AwsysForbiddenError`   | 403         | Insufficient tier for the operation      |
| `AwsysNotFoundError`    | 404         | Resource does not exist                  |
| `AwsysConflictError`    | 409         | Conflict (e.g. custom slug already taken)|
| `AwsysRateLimitError`   | 429         | Rate limit exceeded                      |
| `AwsysError`            | 5xx         | Server-side error                        |

All errors have:
- `message` — Human-readable description
- `code` — Machine-readable code from the API (e.g. `"NOT_FOUND"`)
- `status` — HTTP status code
- `raw` — Raw response body

`AwsysRateLimitError` additionally has:
- `retryAfter` — Seconds to wait before retrying (if provided by the server)

```typescript
import {
  AwsysError,
  AwsysNotFoundError,
  AwsysRateLimitError,
} from "@awsysco/sdk";

try {
  const link = await client.links.get("abc123");
} catch (err) {
  if (err instanceof AwsysNotFoundError) {
    console.log("Link not found");
  } else if (err instanceof AwsysRateLimitError) {
    console.log(`Rate limited. Retry in ${err.retryAfter}s`);
  } else if (err instanceof AwsysError) {
    console.log(`API error [${err.status}] ${err.code}: ${err.message}`);
  }
}
```

## Rate Limiting

The SDK automatically retries on `429 Too Many Requests` responses with exponential backoff (up to 3 retries by default). Configure with `maxRetries`:

```typescript
const client = new AwsysClient({
  apiKey: "awsys_...",
  maxRetries: 5, // retry up to 5 times
});
```

Rate limits depend on your plan:

| Plan       | Hourly limit | Monthly limit |
|-----------|-------------|---------------|
| Pro        | 50 calls     | 1,000 calls   |
| Builder    | 500 calls    | 10,000 calls  |
| Enterprise | 20,000 calls | 1,000,000 calls|

## Contributing

### Environment Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.test` and add your staging API key:
   ```bash
   cp .env.example .env.test
   # Edit .env.test with your staging API key and URL
   ```
4. Run tests: `npm test`
5. Build: `npm run build`

### Development Commands

```bash
npm run build        # Compile TypeScript with tsup
npm run test         # Run integration tests against staging
npm run test:watch   # Watch mode
npm run typecheck    # Type-check without emitting
```

### Test Architecture

Tests are integration tests against the real staging API (`https://staging.awsys.co`). A staging API key (Pro tier or higher) is required. Never commit `.env.test`.

## License

MIT — see [LICENSE](LICENSE) for details.

&copy; 2026 Alpha Wave Systems
