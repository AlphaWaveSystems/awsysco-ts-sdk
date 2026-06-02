# SDK Examples

These examples demonstrate how to use the `@awsysco/sdk`.

## Prerequisites

1. Install dependencies from the repo root: `npm install`
2. Set your API key: `export AWSYS_API_KEY=awsys_your_key_here`
3. Optionally point at staging: `export AWSYS_BASE_URL=https://staging.awsys.co`

## Running examples

All examples run with `npx tsx`:

```bash
# Basic: create a link, list links, check analytics, namespace, webhooks
npx tsx examples/basic.ts

# Advanced: routing rules, OG meta, webhooks, domains, affiliates, saved views, UTM templates
npx tsx examples/advanced.ts

# Original basic usage (legacy)
npx tsx examples/basic-usage.ts
```

## Integration script

`examples/integration.ts` exercises all major happy paths against a live API.
It is intentionally not wired into `npm run test` — run it manually when you have
a real API key and want an end-to-end smoke test:

```bash
AWSYS_API_KEY=awsys_your_key npx ts-node examples/integration.ts
```
