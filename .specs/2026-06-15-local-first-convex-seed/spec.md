# Local-first Convex with an advanced seed — Design Spec

**Date:** 2026-06-15
**Status:** Approved (brainstorming), pending implementation plan

## Goal

Make local development and GitHub CI run against a **local** Convex backend instead of the Convex Cloud dev deployment (`dev:colorful-aardvark-6`), and ship a comprehensive seed that models an **advanced shop** covering nearly every Convex-backed use case, plus a second minimal shop that proves multi-tenant isolation.

## Background (current state)

- `packages/convex` is wired to a **Convex Cloud dev deployment** via `packages/convex/.env.local` (`CONVEX_DEPLOYMENT=dev:colorful-aardvark-6`). `pnpm convex:dev` → `convex dev` connects to the cloud. Apps read `CONVEX_URL` / `NEXT_PUBLIC_CONVEX_URL` / `CONVEX_SERVER_SECRET`; when empty locally, apps run without Convex.
- A full **local-backend toolkit already exists** in `@nordcom/commerce-test-convex`:
  - `startConvex()` (`src/start.ts`) spawns `convex dev --local-cloud-port <port>` in **anonymous local** mode (`CONVEX_AGENT_MODE=anonymous`, blank `CONVEX_DEPLOYMENT`), which provisions a local backend and pushes functions. Returns `{ url, adminKey, stop }`.
  - A **daemon** (`src/daemon.ts`) + **CLI** (`src/cli.ts`, `test-convex start|stop|reset|seed`) run a persistent backend with `--dataDir`, writing marker files (PID/URL/adminKey).
  - **Seed fixtures** (`src/seed/**`): `seedCanonical(url)` seeds a *basic* shop `nordcom-demo-shop.com` (shop + credentials + domains, CMS singletons header/footer/businessData, collections pages/articles/productMetadata/collectionMetadata, global featureFlags + shop joins, live `cmsDocuments`) via `convex import --format jsonLines` (`src/seed/live.ts:importSeedRows`).
- **CI** (`.github/workflows/ci.yml`):
  - `test` job: `pnpm test` — unit tests, fully mocked (no backend; `vi.stubEnv` Convex vars).
  - `convex` job: boots an **ephemeral local** backend via `pnpm convex:dev --once --local-backend-version <pinned>` (two-pass, binary cached by `CONVEX_LOCAL_BACKEND_VERSION`), runs limit tests **only when `packages/convex/**` (and `packages/test-convex/**`) change**.
  - `e2e` job: **disabled** (`if: false`); matrix [storefront, admin]; both suites mock Shopify via `page.route(...)` and depend on a seeded Convex backend (global-setup seeds + resolves tenant).
  - `deploy.yml` / `release.yml`: real **production** Convex deploy, gated on `secrets.CONVEX_DEPLOY_KEY`. **Out of scope — unchanged.**

## Decisions (resolved during brainstorming)

1. **Target shape:** Full local-first, auto-wired. `pnpm dev` boots a seeded persistent local backend and wires the apps; CI runs integration + re-enabled e2e against the same seeded local backend.
2. **Dev wiring:** Fixed port `3210` + fixed dev secret + static env defaults in `.env.example`. Deterministic, no marker-file glue for the apps.
3. **Seed breadth:** One **advanced** shop (`nordcom-demo-shop.com`) spanning every Convex table/field, plus one **minimal** shop (`minimal-demo.com`) for tenant isolation.
4. **Seed profile:** A single enriched `seedCanonical` (additive superset). Existing fixtures are preserved so current e2e/limit assertions stay green; count-based assertions are updated.
5. **CI extent:** Re-enable **both** e2e matrices (storefront + admin) **and** an integration job, run on **every PR**, all against the seeded local backend. No production Convex anywhere in CI.

## Scope boundary

The **Convex layer** is fully seeded. The **product catalog comes from Shopify** (external GraphQL), so it is NOT seeded — e2e mocks Shopify at the network layer (`page.route`). `productMetadata` and `reviews` are keyed to the handles/ids used by the storefront's existing Shopify e2e mock fixtures so they align. Full real-Shopify storefront rendering is out of scope.

## Architecture

### A. Local backend (dev)

- **Persistent anonymous local backend** via the existing daemon, pinned to: port **3210**, `dataDir` **`.convex-local/`** (gitignored), dev secret **`dev-local-secret`**.
- `convex dev` (run by `startConvex`/daemon) pushes the latest functions to the local backend, so it stays in sync with `packages/convex/convex/**`.
- The cloud `pnpm convex:dev` path still works (coexists) but is no longer the local default; `packages/convex/.env.local` (personal, gitignored) is not modified.

### B. Dev orchestration

New idempotent orchestration (a module in `packages/test-convex/src` exposed via the `test-convex` CLI, plus root `package.json` scripts):

- `pnpm convex:local` — ensure daemon healthy on :3210 (skip if `/instance_name` 200); `convex env set` on the backend (`CONVEX_SERVER_SECRET=dev-local-secret`, `CONVEX_AUTH_ISSUER`/`CONVEX_AUTH_APPLICATION_ID`/`CONVEX_AUTH_JWKS_URL` to `https://dev.localhost.invalid…` like CI); seed (idempotent). Fast no-op when already up + seeded.
- `pnpm dev` — `pnpm convex:local && dotenv -c -- turbo dev`. Daemon runs detached; apps start against it.
- `pnpm convex:local:reset` — `test-convex reset` (wipe `.convex-local`) then reseed.
- `pnpm convex:local:stop` — stop the daemon.

### C. Env defaults

`.env.example`, `apps/storefront/.env.example`, `apps/admin/.env.example` ship local-first defaults:

```
CONVEX_URL=http://127.0.0.1:3210
NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210
CONVEX_SERVER_SECRET=dev-local-secret
```

`.gitignore` adds `.convex-local/`. CSP note: storefront `next.config.js` must allow `127.0.0.1:3210` (ws/http) in dev — verify the dev CSP path covers the local URL.

### D. Seed contents (the enriched `seedCanonical`)

**Shop A — `nordcom-demo-shop.com` (advanced).** Preserve all existing fixtures; add:

- **Domains:** primary + `alternativeDomains`, with rows exercising every `shopDomain.status`: one `verified` (`via: 'service_domain'`), one `pending`, one `failed`, one `*.localhost` (`via: 'localhost'`).
- **i18n:** multiple locales (e.g. `en-US` default, `en-GB`, `sv-SE`, `de-DE`).
- **Design/branding:** header logo, primary + secondary accents (with readable foregrounds), theme tokens, icons.
- **Commerce provider:** Shopify with full `authentication` (publicToken, domain, storefrontId, customers clientId) + secret `token`/`clientSecret` in `shopCredentials`; `integrations`, `thirdParty`, commerce config, `showProductVendor`.
- **Collaborators:** 3 users at distinct tiers (`admin`, `editor`, `viewer`) with matching seeded `users` + `sessions` + `identities` (auth family).
- **Feature flags:** global `featureFlags` of each kind (boolean, string/multivariate, number) + `shopFeatureFlags` enables, at least one with a non-trivial `targeting` rule.
- **CMS:** header (with mega-menu/nav), footer, businessData singletons; multiple `pages` and `articles` (rich ProseMirror bodies via the existing richtext codec); several `productMetadata` (handles aligned to e2e Shopify mocks) and `collectionMetadata`; live `cmsDocuments` rows; **draft + published `cmsVersions` history** for at least one page and one article.
- **Reviews:** several `reviews` across product handles with varied ratings/states.
- **Media:** a couple of `media` assets with `media_derivatives` rows (ready + pending) to exercise the derivative-fallback path.

**Shop B — `minimal-demo.com` (bare).** Name, one domain (verified), default locale, minimal Shopify provider, one `admin` collaborator, no CMS extras. Proves hostname→tenant isolation and rich-vs-bare diffing.

**Idempotency:** every insert keys on a natural key (domain, slug, handle, email, `(shop, …)` pairs) so re-running the seed never duplicates. New tables (collaborators/users/sessions/identities, reviews, media, versions, second shop) get the same upsert-by-key treatment as the existing fixtures.

### E. CI

- **Composite action** `.github/common/convex-local/action.yml`: boot the cached local backend (the existing two-pass `convex:dev --once --local-backend-version` flow), `convex env set` the secret + auth, and seed. Reused by the `convex`, new `integration`, and `e2e` jobs (DRY).
- **`integration` job** (new, every PR): boot+seed, run the limit/integration suites against the local backend. No longer gated to convex-only path changes.
- **`e2e` job**: remove `if: false`; matrix [storefront, admin]; each shard boots+seeds the local backend, exports `CONVEX_URL`/`NEXT_PUBLIC_CONVEX_URL`/`CONVEX_SERVER_SECRET` pointing at :3210, runs Playwright (Shopify mocked).
- `deploy.yml` / `release.yml` production paths unchanged.

## Components & boundaries

| Unit | Responsibility | Depends on |
|---|---|---|
| `seed/fixtures/**` | Pure data fixtures (both shops, all tables) | richtext codec, schema shapes |
| `seed/*.ts` mutations | Idempotent insert of each table family | fixtures, Convex import/mutation |
| `seed/canonical.ts` | Orchestrate advanced + minimal shop | the per-family seeders |
| dev-local orchestration | Boot + env-set + seed, idempotent | daemon (`start.ts`), seed |
| `test-convex` CLI scripts | Operator entry points | dev-local orchestration |
| composite CI action | Boot + seed in CI | CLI + pinned backend binary |

## Testing strategy

- **Unit (TDD bulk, `convex-test` in-memory):** per-table specs asserting the enriched seed inserts the expected rows — both shops present; each domain `status`/`via` present; 3 collaborator tiers with auth rows; each flag kind + a targeted enable; reviews; media + derivatives; CMS draft/published versions. Assert **idempotency** (second run = identical row counts).
- **Integration (real local backend):** extend `src/limits/canonical-seed.test.ts` to seed the superset against a live ephemeral backend and re-run for no-dupe verification.
- **Dev orchestration:** unit-test the pure parts (healthcheck parse, env resolution, "already seeded" guard).
- **Workflows:** validated by running on the PR.

## File structure (high level)

- `packages/test-convex/src/seed/fixtures/*` — extend existing; add `users.ts`/`collaborators.ts`, `reviews.ts`, `media.ts`, flag-targeting, cms-versions, and `minimal-shop.ts`.
- `packages/test-convex/src/seed/*.ts` — extend `shop.ts`/`cms.ts`; add `collaborators.ts`, `reviews.ts`, `media.ts`, `versions.ts`, `minimal.ts`; orchestrate in `canonical.ts`.
- `packages/test-convex/src/dev-local.ts` (+ CLI wiring in `cli.ts`) — dev orchestration.
- Root `package.json` — `convex:local`, `convex:local:reset`, `convex:local:stop`, `dev` wiring.
- `.env.example`, `apps/storefront/.env.example`, `apps/admin/.env.example`, `.gitignore`.
- `.github/common/convex-local/action.yml`; `.github/workflows/ci.yml` (integration job, re-enable e2e).
- Docs: local-development guide + README updates.

## Risks / considerations

- **e2e green after enrichment:** additive fixtures should keep existing assertions passing; multi-tenant/list specs that count shops or pages must be updated for the second shop + extra content.
- **Backend boot time in CI:** mitigated by the cached pinned binary; each job boots its own backend (runners are isolated).
- **CSP / WebSocket in dev:** confirm the storefront dev CSP allows `127.0.0.1:3210`.
- **Auth env on the local backend:** functions expect `CONVEX_AUTH_*`; the orchestration sets placeholder dev values (mirroring CI's `ci.localhost.invalid`).
- **Secret matching:** the app `CONVEX_SERVER_SECRET` must equal the value `convex env set` writes on the backend; both pinned to `dev-local-secret` (dev) / a CI value.
