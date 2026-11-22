# Phase 0 Persona Asset Service (`pipeline/service/`)

Read-only Cloudflare Worker for the VI persona asset service (`https://assets.vidoxlabs.dev`), consolidated into `videsign` under ADR-022 (extending ADR-002 and ADR-010 item 3). Approved images live in the public `vi-assets` R2 bucket and are addressed at `https://assets.vidoxlabs.dev`. Manifest and request metadata live in the D1 database `vi_assets`. The staging bucket `vi-assets-staging` is bound for later phases and is not readable through this API.

## Phase 0 scope

This service is read-only.

| Method | Path | Result |
|---|---|---|
| `GET` | `/healthz` | Readiness. `200` when bindings and `ASSET_BASE` are valid, otherwise `503`. |
| `GET` | `/v1/assets` | Visible assets. Optional filters: `vi`, `type`, `slot`, `version` (`latest` or a number). Keyset page: `after` and `limit` (default 100, max 200). The body includes `next`, or `null` on the last page. |
| `GET` | `/v1/assets/:id` | One asset. `:id` is the asset id, with slashes percent-encoded. |
| `GET` | `/v1/assets/:vi/:type/:slot/latest` | `302` to the immutable object URL of the highest `published` version. `Cache-Control: public, max-age=300`. |
| `OPTIONS` | the three asset paths | Preflight. CORS headers are added only for an allow-listed `Origin`. |

Visible statuses are `published`, `superseded`, `needs-regen`, and `legacy`. `withdrawn` and `deleted` are not returned. `version=latest` and `/latest` use only `published`. If a slot has no published version, `/latest` is `404` and the list is empty. They do not fall back to `legacy`, `needs-regen`, or `superseded`.

Anything else is `404`. A known path with another method is `405`. A bad filter, version, limit, or cursor is `400`.

## Failed-auth throttling and audit events

A request that includes an `Authorization` header is an authentication attempt. Phase 0 has no token verifier, so the attempt fails. Failures are counted in two buckets that share the same limits, `AUTH_FAIL_LIMIT_PER_MINUTE` (default 10) and `AUTH_FAIL_LIMIT_PER_HOUR` (default 100): the client network, and the credential prefix. Either bucket being over its limit returns `429` with `Retry-After`. Public reads omit the header.

- The network bucket is an HMAC-SHA256 digest of the address truncated to an IPv4 `/24` or an IPv6 `/64`.
- The credential bucket is an HMAC-SHA256 digest of the first 8 characters after the auth scheme.
- The address, the credential, the prefix, and the HMAC input are never stored or logged.
- A credentialed request with no `CF-Connecting-IP`, or with a value that is not an IPv4 or IPv6 address, returns `400` and is not counted.
- Each recorded failure is one D1 write, which purges counter rows older than 2 hours via SQLite triggers (`auth_fail_purge_insert` / `auth_fail_purge_update`). Once a bucket is already over its limit, later requests return `429` without additional writes. At most one `events` row (`auth-fail`) is stored per minute window and per hour window (`auth_fail_event`).

Later phases (vocabulary, manifest, requests, review, admin import, and takedown) are not implemented in Phase 0.

## Configuration

`pipeline/service/wrangler.toml` declares:

- R2 `ASSETS` bound to bucket `vi-assets`
- R2 `STAGING` bound to bucket `vi-assets-staging`
- D1 `DB` bound to database `vi_assets` (`database_id` uses the zero placeholder in public source control and is supplied at deploy time)

Runtime variables and secrets:

- `ASSET_BASE` must be `https://assets.vidoxlabs.dev`. If missing or pointing to any other host/scheme, data routes fail closed with `503` and `/healthz` reports the failure.
- `CORS_ORIGINS` is a comma-separated list of exact `https:` origins. Plain `http:` origins and `*` are ignored. Empty or unset sends no `Access-Control-Allow-Origin`. Prefixes `/v1/admin`, `/v1/review`, and `/v1/candidates` never receive CORS headers.
- `THROTTLE_HMAC_KEY` is a Worker secret set via `wrangler secret put THROTTLE_HMAC_KEY`, never committed to source control. If missing or empty, credentialed requests fail closed with `503` while anonymous public reads remain available.

Public reads require `DB`, `ASSETS`, and valid `ASSET_BASE`. They succeed even when `STAGING` is absent, while `/healthz` reports `staging_bucket: "missing"` with HTTP `503`.

## Migrations

`pipeline/service/migrations/` holds the D1 schema migrations (digests recorded in `manifest.json`):

- `0001_init.sql`, `0002_tokens.sql`, and `0003_idempotency.sql` are immutable applied schema files verified by SHA-256 in `test/asset-service.test.js`.
- `0004_auth_fail_windows.sql` adds `auth_fail_windows`, `auth_fail_purge_insert`, `auth_fail_purge_update`, and `auth_fail_event`. Until applied in D1, credentialed requests fail closed with `503` and anonymous public reads continue using the initial tables.

## Local verification

From the `videsign` repository root:

```sh
npm test    # Runs test/asset-service.test.js (via node:sqlite) alongside all design-system tests
npm run lint
npm run canon:check
npm run safety:scan
```
