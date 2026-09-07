# Security Review — @awsysco/sdk 1.4.0

Performed as part of the 1.4.0 contract-parity release. Findings by severity; "Status" reflects
what shipped in this release.

## Critical

None found.

## High

None found in the SDK itself. See **Dependency advisories (dev-only)** below for a critical/high
finding in the build/test toolchain — it does not ship in the published package.

## Medium

**M-1: `raw`/`body` on a thrown error is not redacted beyond the API key/echoed access tokens.**
- **Risk**: an error's `raw` field is the parsed (or raw-text) response body from the platform. If
  a future platform response ever echoes back some other sensitive request field (beyond the
  `accessToken` case tested below), it would appear in `err.raw` — though never in `err.message`/
  `err.code`, and never in `JSON.stringify(err)`/`util.inspect(err)`, since the redaction override
  strips the API key from those but does not deep-scrub arbitrary fields inside `raw`.
- **Status**: partially mitigated. `AwsysError`'s `toJSON()`/`[util.inspect.custom]()` omit the raw
  API key; `tests/contracts/behaviors.test.ts`'s redaction tests cover the key itself and the one
  known echo case (`import.start`'s `accessToken`, per the contract fixture's explicit note). A
  general "scrub every sensitive-looking field in `raw`" pass was out of scope for this release —
  `raw` is intentionally the unmodified response body so consumers can debug against it; redacting
  it generically would need a denylist of field names that doesn't currently exist anywhere in the
  platform's error responses.
- **Recommendation**: if the platform ever echoes another secret-shaped field in an error body,
  add it to the redaction test and confirm it's excluded, same as `accessToken`.

## Low

**L-1: `console.warn` deprecation notice on `customDomains.activate()` is not suppressible.**
- Fires once per process on first call. Low risk — it's a deprecation notice, not a leak — but a
  consumer capturing all `console.warn` output for other purposes has no opt-out. Acceptable for
  1.4.0; worth a `silenceDeprecationWarnings` client option if more deprecations are added later.

## Informational

**I-1: TLS verification cannot be disabled — confirmed, this is correct.** The SDK uses the
runtime's native `fetch`, with no `NODE_TLS_REJECT_UNAUTHORIZED`-style override or custom `Agent`
anywhere in `src/`. There is no SDK-level option to weaken TLS verification.

**I-2: `baseUrl` scheme validation.** `AwsysClient` now rejects any `baseUrl` that isn't
`http://`/`https://` (throws `AwsysConfigurationError` before any request). Covered by
`tests/contracts/behaviors.test.ts`'s `base_url_override` scenario (`ftp://x`, `awsys.co`).

**I-3: API key redaction — what's tested.** `JSON.stringify(client)`, `util.inspect(client)`, and
both serializations of a thrown error are asserted to never contain the raw key
(`tests/contracts/behaviors.test.ts`, `redaction` scenarios). The client exposes a redacted display
form (`awsys_...<last4>`) instead.

**I-4: Zero runtime dependencies maintained.** `package.json` has no `dependencies` — confirmed
unchanged in this release. The entire dependency surface (`npm audit`'s findings below) is
dev-only tooling (vitest/vite/tsup/eslint), none of which ships in `dist/` or is installed by a
consumer of this package.

**I-5: `.env.test` handling.** Gitignored (`.gitignore` covers `.env`, `.env.*`); `tests/setup.ts`
no longer throws when `AWSYS_API_KEY` is absent — integration `describe` blocks skip cleanly
instead, so a fresh checkout with no local secret never fails CI or `npm test`.

**I-6: Secret-scanning CI already in place.** `.github/workflows/secret-scan.yml` (gitleaks) runs
on every push/PR to every branch — predates this release, unchanged.

## Dependency advisories (`npm audit`)

Run at release time: `npm audit` reported 8 advisories; `npm audit fix` (non-breaking only)
resolved `brace-expansion` (DoS, high) and `nanoid`/`postcss` findings, leaving **5 remaining, all
in the same dependency chain**:

| Package | Severity | Advisory | Fix requires |
|---|---|---|---|
| `vitest` | Critical | [GHSA-5xrq-8626-4rwp](https://github.com/advisories/GHSA-5xrq-8626-4rwp) — arbitrary file read/execute via the Vitest UI server | `vitest@5.x` (major bump) |
| `@vitest/coverage-v8` | Critical | depends on vulnerable `vitest` | `vitest@5.x` |
| `vite` | High | [GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff) — `server.fs.deny` bypass on Windows | pulled in by `vitest@5.x` |
| `vite-node` | Moderate | depends on vulnerable `vite` | pulled in by `vitest@5.x` |
| `esbuild` | Moderate | [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) — dev server accepts requests from any origin | pulled in by `vitest@5.x` |

**Accepted as debt for 1.4.0, not fixed**: all five require `vitest`'s next major version, which
this release explicitly avoids force-bumping (per the task scope — a major test-framework bump
deserves its own PR with its own migration review, not bundled into a parity release). **Actual
exposure is limited**: every one of these is a *dev-time* vulnerability in the local test runner /
dev server (`vitest`'s UI mode, `vite`'s dev server) — none of `vitest`/`vite`/`vite-node`/
`esbuild`/`@vitest/coverage-v8` is a runtime dependency or ships in the published `dist/` output,
and this repo's CI never runs `vitest --ui` or a `vite` dev server (only `vitest run`).

**Recommendation**: track a follow-up PR to bump `vitest` to its next major (and update
`@vitest/coverage-v8` alongside it) once its migration notes have been reviewed independently.
