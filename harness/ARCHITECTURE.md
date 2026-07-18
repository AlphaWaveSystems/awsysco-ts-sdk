<!-- HARNESS:START
     version=0.32.0
     schema=1
     updated=2026-07-18T02:25:54Z
     DO NOT EDIT — regenerate with: harness-ctl update /Users/patrickbertsch/dev/awsysco-ts-sdk
-->

# Architecture — @awsysco/sdk

> Auto-generated from constitution scan on 2026-07-18T02:25:54Z.
> Reflects the state of the repo at install time — update manually as the project evolves,
> or re-run `harness-ctl update /Users/patrickbertsch/dev/awsysco-ts-sdk` to refresh from the latest scan.

---

## Project identity

| Field | Value |
|---|---|
| Name | @awsysco/sdk |
| Path | `/Users/patrickbertsch/dev/awsysco-ts-sdk` |
| Repository | https://github.com/AlphaWaveSystems/awsysco-ts-sdk.git |
| Stack | typescript |
| Language(s) | TypeScript, JavaScript |
| Runtime | Node.js v22.23.1 |
| Package manager | npm |
| Zeus owner | `hephaestus` |

---

## Project overview


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


---

## Stack overview

TypeScript project. Entry point at `src/index.ts`.

### Key entry points


### Build and test commands

| Action | Command |
|---|---|
| Install deps | `npm install` |
| Build | `npm run build` |
| Test | `npm run test` |
| Lint | `(not detected — configure manually)` |
| Dev server | `npm run dev` |
| Deploy (staging) | `npm run deploy:staging` |
| Deploy (production) | `npm run deploy` |



---

## Directory structure

```
├── AGENTS.md
├── CLAUDE.md
├── README.md
├── SECURITY.md
├── dist/
│   └── index.d.mts
│   └── index.d.ts
│   └── index.js
│   └── index.mjs
├── examples/
│   └── README.md
│   └── advanced.ts
│   └── basic-usage.ts
│   └── basic.ts
│   └── integration.ts
├── harness/
│   └── ARCHITECTURE.md
│   └── FEATURES.md
│   └── INFRASTRUCTURE.md
│   └── SECURITY.md
│   └── TESTING.md
│   └── TOOLS.md
│   └── VERSION
│   └── WORKFLOWS.md
├── package-lock.json
├── package.json
├── reports/
├── src/
├── tests/
├── tsconfig.json
├── vitest.config.ts
```

---

## Dependencies

**Runtime dependencies (0):**



**Dev dependencies:**

- `@types/node` ^20.0.0

- `@vitest/coverage-v8` ^1.0.0

- `dotenv` ^16.0.0

- `tsup` ^8.0.0

- `typescript` ^5.0.0


---

## Environment variables

Variables the project reads at runtime. Do not commit values — use the harness vault.

| Variable | Required | Purpose |
|---|---|---|

| `AWSYS_API_KEY` | yes | (see .env.example) |

| `AWSYS_BASE_URL` | yes | (see .env.example) |



---

## External services



*(none detected)*


---

## Constitution context

Rules extracted from `CLAUDE.md` at install time:

<!-- HARNESS:START
     version=0.31.0
     schema=1
     agent=awsysco-ts-sdk
     updated=2026-07-04T02:31:42Z
     DO NOT EDIT THIS BLOCK — regenerate with: harness-ctl update /Users/patrickbertsch/dev/awsysco-ts-sdk
-->

# Harness — Active Constraints

**This file is the entry point for every task in this project — always start here.**

**Agent:** `awsysco-ts-sdk` · trust: `worker` · model: `mid`
**Budget:** 40 steps · 80000 tokens · $3.00 per session
**Privacy:** local_preferred — local models preferred; cloud only on low confidence
**Memory namespace:** `awsysco-ts-sdk-worker`


## Must escalate (blocks until human approves)

*(truncated — see CLAUDE.md for full rules)*

*(Full rules in `CLAUDE.md` — this is a harness-generated summary only)*



---

## Notes from previous version

---

<!-- Add architecture decisions, diagrams, and notes below.
     The harness block above is managed automatically — everything below is yours. -->



<!-- HARNESS:END -->

---

<!-- Add architecture decisions, diagrams, and notes below.
     The harness block above is managed automatically — everything below is yours. -->
