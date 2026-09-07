# Changelog

All notable changes to `@awsysco/sdk` are documented here. This project follows
[Semantic Versioning](https://semver.org/) — minor releases are additive/deprecation-only per
ADR-014 (no public signature is ever removed or narrowed in a minor; deprecate, then remove in the
next major).

## 1.4.0 (unreleased)

Brings the SDK to full parity with `sdk-behavior-contract.md` v1.0 and closes Gate 3 (every
scenario in the platform's `sdk-contract.json` — 79 capability, 21 error, 8 behavior — is now
exercised by a contract-fixture test). References below are to that contract's section numbers
(§1–§13) where applicable.

### Added

- **New resources**: `client.profile` (§ n/a — `GET`/`PATCH /api/user/profile`), plus two missing
  `client.imports` methods: `getRedirectMapCsv()` / `getRedirectMapJson()`.
- **New error classes** (§6): `AwsysServerError` (5xx), `AwsysNetworkError` (transport-level),
  `AwsysTimeoutError` (extends `AwsysNetworkError`), `AwsysConfigurationError`. Error parsing now
  tolerates all four documented response-body shapes plus non-JSON and HTML bodies.
- **Timeouts** (§3): `AbortController`-based `timeoutMs` (default 30000ms), configurable at the
  client level and per-call.
- **Retry policy** (§4): 502/503/504 and network errors now retried for `GET`/`PUT`/`DELETE`;
  quota-class 429s (`HOURLY_LIMIT_EXCEEDED`/`DAILY_LIMIT_EXCEEDED`/`MONTHLY_LIMIT_EXCEEDED`) are no
  longer retried and raise immediately with `retryAfter`/`code`/`resetsAt`; backoff now uses full
  jitter and accepts `Retry-After` as either seconds or an HTTP-date.
- **Config** (§1–§2): `AWSYS_API_KEY`/`AWSYS_BASE_URL` environment-variable fallback;
  non-`http(s)` `baseUrl` values now throw `AwsysConfigurationError` instead of silently being
  used.
- **User-Agent** (§11): `awsysco-ts-sdk/<version> (node/<runtime>)`, with `<version>` injected
  from `package.json` at build time and covered by a test asserting equality.
- **Redaction** (§1, §12): the client and every error now implement `toJSON()`/
  `util.inspect.custom` so the raw API key never appears in `JSON.stringify`/`console.log` output.
- **Pagination** (§7): `client.links.listAll()` async iterator — clamps `limit` to 100, stops on
  `hasMore:false` or a short/empty page.
- **`src/timestamps.ts`**'s `parseTimestamp()` — normalizes an ISO string, `{_seconds,_nanoseconds}`,
  or `{seconds,nanoseconds}` to an ISO string (ADR-017: string, not `Date`, for the 1.x line);
  unrecognized shapes pass through unchanged. Exported for consumers who want to normalize a raw
  timestamp field — the SDK does not transform response bodies automatically for any field.
- **Tooling**: ESLint (`typescript-eslint` type-checked), `npm run lint`; `.github/workflows/ci.yml`
  (lint/typecheck/test/build/pack-install smoke test, Node 18/20/22 matrix);
  `.github/workflows/contract-drift.yml` (auto-detects platform contract drift via
  `repository_dispatch` + a weekly schedule, files a labeled issue; a nightly job also runs the
  staging integration suite); `publish.yml` now runs lint/typecheck/test/build before publishing.
- `SECURITY-REVIEW.md`, this `CHANGELOG.md`, and a restructured `README.md` covering every
  resource.

### Fixed

- `analytics.getRecentClicks()` called the wrong path (`/api/user/recent-clicks`, which never
  worked in production); now correctly calls `GET /api/user/clicks/recent` and accepts an optional
  `since` parameter (ADR-007). *(This route can also return `403 FEATURE_DISABLED` when the
  account's "Live Globe" flag is off — surfaced as `AwsysForbiddenError`.)*
- `links.list()` now parses the real response envelope (`{links, pagination:{limit,offset,hasMore}}`)
  instead of guessing between `links`/`data` keys.
- `folders.list()` no longer force-casts an unrecognized envelope shape to `Folder[]` (a latent
  `undefined`-as-array bug); it now returns `[]` deterministically.
- `folders.update()` now `PATCH`es the correct unversioned `/api/folders/:folderId` route — the
  previous `/api/v1/folders/:id` route 404s on the platform (ADR-011, verified live on staging).
- `webhooks.list()`/`create()`/`delete()`/`test()` now call the versioned `/api/v1/webhooks/*`
  routes (preferred where a twin exists); `update()` and `listEventTypes()` correctly stay on the
  unversioned routes, which have no `/api/v1/` equivalent.
- `tags.add()` now sends `{tags: [...]}` (an array) — the platform never accepted the previous
  `{tag: "..."}` body shape (`folders.js:128`).
- `utmTemplates.create()` now sends the platform's actual field names (`utmSource`/`utmMedium`/
  `utmCampaign`) instead of `source`/`medium`/`campaign`, which the platform silently ignored; the
  old field names are still accepted as input and normalized internally.
- `affiliate.listPrograms()`/`listPartners()`/`discover()`/`listPartnerships()` previously
  returned the entire `{programs|partners|partnerships: [...]}` response envelope cast to an
  array (would throw on `.map()`/iteration at runtime); they now correctly unwrap the array.
- `imports.start()`'s request body casing standardized to camelCase (`accessToken`, not
  `access_token`) to match the contract fixture — the platform actually accepts both, so this was
  not a functional break, just a correctness/consistency fix.

### Deprecated

- `customDomains.activate()` (ADR-006) — this endpoint requires Firebase session auth and has
  never been reachable with an API key. It now warns once via `console.warn` and throws
  `AwsysForbiddenError` with guidance instead of making a network call that could only ever fail.
  Will be removed in the next major version.
- Several type fields that never matched the platform's actual response shape are now marked
  `@deprecated` rather than removed (ADR-014): `PaginatedResponse.total` (always `undefined` — use
  `hasMore`/`limit`/`offset`), `UtmTemplate`/`CreateUtmTemplateOptions`'s `source`/`medium`/
  `campaign` (use `utmSource`/`utmMedium`/`utmCampaign`), `TrustScoreResult`'s `short`/`long`/
  `score`/`status` (use `shortCode`/`trustScore`/`trustStatus`), `AgentLinkStats`'s
  `totalAgentClicks` (use `agentClicks`, which is a number), and several `UsageStats` fields that
  the real `GET /api/user/stats` response never included.

### Breaking

None. Every change above is additive or deprecation-only, per ADR-014.

## 1.3.0

- `feat: imports resource + analytics.getAggregateStats` (Workstream B2, #9) — added
  `client.imports` (`start`/`list`/`getStatus`/`cancel`/`waitForCompletion`) and
  `client.analytics.getAggregateStats()`.

## 1.2.0

- `feat: add usage and web2app resources` (#8) — added `client.usage.get()` and
  `client.web2app.consumeSession()`.

## 1.1.1

- `chore: bump version to 1.1.1` (#7).

## 1.1.0

- `feat(links): add expireFallbackUrl` (#5) — added `expireFallbackUrl` to
  `CreateLinkOptions`/`UpdateLinkOptions`/`Link`.
- `test(links): add expireFallbackUrl passthrough test` (#6).

## 1.0.1

- `fix(tests): skip on EMAIL_NOT_VERIFIED` (#3).
- `fix(security): add .token-publish to .gitignore` (#4) — precautionary; no key was ever
  published.

## 1.0.0

- `feat: v1.0.0 — full SDK parity across all 16 resource classes` (#2) — initial full-surface
  release: links, analytics, qr, folders, bulk, me, tags, trustScore, dataExport, namespace,
  utmTemplates, webhooks, savedViews, customDomains, agentlink, affiliate.
- `ci: add npm publish workflow` (#1).

## 0.1.0

- `feat: initial TypeScript SDK implementation` — first published version.
