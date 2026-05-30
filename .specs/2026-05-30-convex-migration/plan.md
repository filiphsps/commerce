# Mongo → Convex Migration — Phased Plan

Companion to [`spec.md`](./spec.md). Prior analysis: [`.specs/2026-05-30-mongo-convex-exploration/spec.md`](../2026-05-30-mongo-convex-exploration/spec.md).

**Decomposition:** treat the move as **Migration-1** (schema unification, stays on Mongo — the real de-risker) then **Migration-2** (datastore swap to Convex). After Migration-1, Convex is a pure storage swap under an already-unified schema, never a simultaneous schema+store big-bang.

**Cutover lever:** the `packages/db` service seam for storefront data; the Payload adapter seam (`PAYLOAD_DB`) for CMS content. Per-service flag `DB_BACKEND_<service>=mongo|dual|convex`. **The CMS half has no `packages/db` seam** — storefront CMS reads go through Payload's Local API (`get-payload-instance`/`_loaders.ts`), so a **parallel dual-read loader** on that path is required (Phase 6) or CMS content gets an unguarded big-bang.

---

## Phase 0 — PREREQUISITE: schema unification on Mongo (Migration-1)

**Goal:** one canonical shop/tenant record, `attachShopSync` deleted, reviews as id-reference — all **on Mongo**, shipped and baked. This is the rollback floor and satisfies "never two databases in sync" on its own.

**Pre-step spike (gating, before any code lands):** prove `plugin-multi-tenant` `tenantsSlug` can repoint from `tenants` to the unified `shops` table with an **opaque-id** tenant key — the plugin injects a `tenant` relationship field into every tenant-scoped collection keyed on that slug, and storefront filters must match. Shared with Track B. **If this spike fails, the whole unification approach is reconsidered.**

**Key steps:**
1. Collapse Mongoose `shops` + Payload `tenants` + Payload `shops` into one canonical record; tenant identity = the row id; preserve the Mongo ObjectId as `legacyId` projected to `shop.id`.
2. Delete `attachShopSync` (`apps/admin/src/payload.config.ts:95`) + `packages/cms/src/shop-sync/*`.
3. Convert `reviews` to a `shopId` relationship on both storefront and Payload sides; delete the embedded `ShopSchema` snapshot in `packages/db/src/models/review.ts`; backfill existing embedded-snapshot reviews.
4. De-embed collaborators → join shape; rewrite `findByCollaborator`; migrate existing collaborator arrays.
5. Rewrite every `resolveTenantId(payload, shop.id)` call site, the `where:{tenant:{equals:tenantId}}` filters, and the WeakMap cache to the unified identity.
6. Data-migrate; ship.

**Exit criteria:** repoint spike green; admin + storefront run on the unified Mongo schema with `attachShopSync` gone; reviews/collaborators/featureFlags reads work over canonical tables; full test suite green; baked in production independently.

---

## Phase 1 — Adapter kill-criteria spike (days-long, hard stop conditions)

**Goal:** prove or kill the bespoke `convexAdapter` **before** committing the org. Time-boxed; explicit stop conditions.

**Key steps:**
1. Exact-pin Payload `3.85.0` (no caret). Scaffold `convexAdapter` via `createDatabaseAdapter`: `name`/`packageName`/`defaultIDType:'text'`/`migrationDir`, no-op `connect`/`init`/`destroy`, `beginTransaction`→`null` + no-op commit/rollback. Wire `PAYLOAD_DB=mongo|convex` into `buildPayloadConfig` (replacing `db: mongooseAdapter` at `packages/cms/src/config/index.ts`).
2. `generateSchema` for **one** collection (`pages`): emit `pages` + `_pages_versions` + `pages_i18n` + the internal collections (`payload-preferences`, `payload-locked-documents`, `payload-migrations`, `payload-jobs`) with `by_tenant_slug`/`by_tenant_status_updated`/`by_payloadId`/`by_parent_updated` indexes. Add `pnpm cms:schema:gen` + `cms:schema:gen:check` drift gate.
3. Deploy generic CRUD + Where-AST compiler functions (equality/range→`withIndex`, residual→bounded `.filter()`, `contains`/`like`→`searchIndex`) with the scan-budget guardrail throwing `BoundedScanExceededError` before 32k/16 MiB. Adopt `@get-convex/aggregate` for `count`/`totalDocs` **and** `aggregate.at(offset)` for cursor derivation.
4. Implement must-have CRUD + version surface for `pages` with the coalesced doc+version mutation + `latestVersionId` pointer; define `createVersion` dedup/reconcile semantics.

**STOP / KILL conditions (any → halt and escalate):**
- The admin-boot tripwire (`next build` + `payload init` + headless create/edit a `pages` doc **+** preferences read/write **+** doc-lock acquire/release) cannot be made green within the box.
- The contract test cannot reflect a stable `BaseDatabaseAdapter` surface (interface churn makes it untrackable).
- `create`→`createVersion` cannot be made to yield exactly one version row equal to Payload's post-hook snapshot.
- The concurrent-autosave OCC test shows unacceptable retry/contention at target concurrency.

**Exit criteria:** tripwire green for `pages`; contract test passes; offset pagination + `totalDocs` stay off an unbounded scan; OCC behavior characterized and acceptable; kill conditions all clear.

---

## Phase 2 — Convex schema + multi-tenant safety core

**Goal:** the full `convex/schema.ts` and fail-closed RLS exist and deploy via CI.

**Key steps:**
1. Author `convex/schema.ts` (Track C tables + Track B content/`_versions`/`_i18n` + internal collections) — Track B and Track C schemas **merge into one** file.
2. Build `tenantQuery`/`tenantMutation` (`customQuery`+`customCtx` over RLS `defaultPolicy:'deny'`) + `systemQuery`/`systemMutation` escape hatch (crons/migrations/`resolveShop`/internal-Payload-collections/super-user) + subscription registry + circuit breaker.
3. Land the CI-blocking barrel + Biome gate forbidding raw `query`/`mutation` in app modules.
4. Self-host the open-source Convex backend for CI; wire `convex deploy` gated on config edits; expand/contract deploy dry-run + backfill mutation runner.

**Exit criteria:** schema deploys; deny-default proven (a query without an explicit rule is denied); barrel gate blocks a raw-`query` PR in CI; internal-collection `systemQuery` paths verified.

---

## Phase 3 — Test-harness swap

**Goal:** Convex test harness mirrors the `@nordcom/commerce-test-mongo` contract; Mongo harness stays until Convex proves green.

**Key steps:**
1. `@nordcom/commerce-test-convex` cloning `packages/test-mongo`'s daemon/start/cli lifecycle around `convex dev --local` (spawn + teardown parity so `pnpm dev`/e2e keep their in-process contract).
2. Adopt `convex-test` (JS mock) for fast hermetic unit tiers.
3. Author the **limit-boundary** integration tests `convex-test` cannot cover: a 1 MiB max-locale Lexical `pages` fixture (golden shred/reassemble fixtures), a tenant list past the scan ceiling, concurrent-autosave OCC, deep-populate (`header` `depth:6`).
4. Pre-build/cache the Convex local-backend binary + a pre-deployed schema snapshot as a CI artifact so per-test boot is spawn-only.

**Exit criteria:** harness boots within the e2e flake budget (benchmarked); limit-boundary tests run in CI; `@nordcom/commerce-test-mongo` retained.

---

## Phase 4 — Convex→Next revalidation bridge

**Goal:** Convex writes invalidate Lane-1 cached HTML durably.

**Key steps:**
1. Dedicated `/api/revalidate/convex` route (or discriminated branch) — **verify HMAC FIRST**, then a CMS-publish body schema; share only the tail (`cache.invalidateRaw`/`cache.invalidate.tenant`/`evictApolloClient`). Shopify branch untouched.
2. Publish mutation → `scheduler.runAfter(debounce, internalAction)` post-commit; tags derived **inside Convex** (publish-event→tags, reusing `tenantRootTags`/`_loaders.ts` taxonomy), so the bridge never calls back through the flagged `Shop.findByDomain`.
3. Resolve per-tenant storefront URL from the unified record's primary-domain field (custom-vs-platform handling).
4. Durable delivery: `@convex-dev/action-retrier`/workpool, **throw on non-2xx**, bounded backoff, dead-letter + alert, `eventId` dedup, `ts` replay window, debounce coalescing (publish only, never the 2s autosave). Incremental reconciliation cron (replay unacked tags, rate-limited — not a global full-sweep).
5. Secret in Convex env + Next env; dual-accept `{current, previous}` rotation window. Add Convex WSS/HTTPS to `connect-src` CSP.

**Exit criteria:** a Convex publish invalidates the corresponding Lane-1 HTML; a forced non-2xx triggers retry then DLQ; a dropped event self-heals via the cron; autosave never triggers revalidation.

---

## Phase 5 — Native storefront reads behind the unchanged seam + prerender audit

**Goal:** `packages/db` internals run on Convex with signatures unchanged; prerender clocks respected.

**Key steps:**
1. Implement deployed functions: `shops.byDomain` (shopDomains index→`db.get`), `shops.byDomainWithCredentials` (`systemQuery` for the credentialed hot path), `shops.byId`/`byCollaborator`/`findAll`, `reviews.byShop`/`findAll`, `featureFlags.byKey`/`findAll`, user/session/identity CRUD as `systemQuery`. Project `_id`→`id`, `_creationTime`→`createdAt`; project `legacyId`→`shop.id`.
2. Rewrite `packages/db` internals: replace `db.ts` `mongoose.connect` with a lazy `ConvexHttpClient`; reimplement all six services preserving every signature, the `{shop,locale}` convention, and `OnlineShop`/`ShopBase`/`ReviewBase` return types. Move credential masking to the `shopCredentials` table boundary; **re-apply `experimental_taintUniqueValue` after `ConvexHttpClient` deserialization** (taint does not survive the wire).
3. Make every shop write a **single** Convex mutation (shops + shopCredentials + shopDomains-diff + join tables atomically); forbid multiple `ConvexHttpClient.mutation` calls per logical write (lint/CI gate). Enforce `shopDomains.domain` uniqueness + stale-row delete-diff in that mutation; wrap `.unique()` to degrade to logged first-match.
4. Swap the loader closures in `apps/storefront/src/middleware/storefront.ts` (`resolveShopSummary`/`resolveShopLocales`) from `Shop.findByDomain` (Mongo) to `ConvexHttpClient.query`; keep `shop-cache.ts` TTL/LRU untouched; confirm middleware stays Node runtime; benchmark miss-path p50/p99 from the real middleware region vs the single Convex region.
5. **Prerender audit:** wrap every new `ConvexHttpClient` read in the correct `'use cache'`/`connection()` boundary; validate `cacheComponents` prerender against existing storefront snapshot tests (the team is actively fighting prerender-clock guards — recent commits `bee469a`, `1b5df45`, `7952ca`).

**Exit criteria:** services pass behind unchanged signatures; single-mutation shop write verified atomic; taint re-applied at the boundary; prerender snapshot tests green; miss-path latency benchmarked and within budget (else add a regional replica/co-location).

---

## Phase 6 — Reactivity surfaces + CMS-content dual-read loader

**Goal:** land the three lanes and give CMS content the same shadow safety as `packages/db` services.

**Key steps:**
1. Mount the thin `ConvexReactClient` provider in the storefront root layout (wraps children only, reads no request data); PPR prerender test proving the static shell is unchanged.
2. Tag every storefront surface reactive-island vs static-SEO via the §2.1 decision rule; record the map in the spec.
3. First authenticated island end-to-end (account/orders): `preloadQuery` in the dynamic segment + `usePreloadedQuery` in a `'use client'` child; verify snapshot-then-live; per-surface kill switch downgrades to the preloaded snapshot. Plumb NextAuth-JWT token refresh into a `ConvexReactClient` auth fetcher; on auth failure render the read-only snapshot, don't blank.
4. PPR coexistence on a public route (PDP): static cached SEO body + one Suspense-wrapped interaction-gated island. **Required hard gate:** a per-route PPR prerender snapshot test asserting (a) SEO HTML present in the static shell, (b) island renders as a dynamic Suspense hole, (c) no `preloadQuery` executes during prerender. (Lint forbidding `preloadQuery`/`useQuery` in `use cache` is **advisory** — it cannot catch transitive poisoning; the prerender test + `cacheComponents` build error are the load-bearing guards.)
5. **CMS-content dual-read loader** on the Payload Local API path (`get-payload-instance`/`_loaders.ts`): read Payload-on-Mongo + Convex, serve one, log divergence — so pages/articles/metadata get shadow→divergence-ledger→flip parity. Decouple CMS-content read-flip from admin-write-cutover.
6. Keep Shopify-owned cart/inventory and single-editor theme preview **off** Convex subscriptions; gate the storefront preview route strictly behind `draftMode()`/auth and code-split the Convex client out of the public bundle. Assert in CI the public storefront ships zero Convex client/WebSocket.

**Exit criteria:** static shell unchanged; account/orders island live with snapshot fallback + token refresh; PDP prerender gate green; CMS dual-read loader logging divergence; public-bundle zero-Convex assertion green.

---

## Phase 7 — Data pipeline + reconciliation (idempotent, re-runnable)

**Goal:** a deterministic, re-runnable ETL with a parity gate strong enough to authorize an authority flip.

**Key steps:**
1. `mongoexport` per collection → JSONL → pure deterministic transform (remap ObjectId→Convex id **and preserve `legacyId`**; emit `by_payloadId`; normalize `alternativeDomains`→one-row-per-`(domain→shopId)`; shred all-locales-in-one-doc Lexical into `_i18n` side rows under 1 MiB) → `convex import`. **Also migrate `_versions` rows** + a per-doc quiesce/catch-up protocol for the 2s-autosave moving target, and Payload **media** docs (S3 object keys + the `scheduler.runAfter(0)` S3-hook relocation).
2. **ETL id-remap scope:** shops, `sessions.user`, collaborators, featureFlags refs, `reviews.shopId`, **plus** cart records, analytics, and any externally-persisted `shopId` (Shopify webhooks/metafields, client cookies, cached/ISR output). Preserve the public `shop.id` string contract.
3. Reconciliation as a first-class Convex action: **full per-collection canonical-checksum parity** (cheap at tenant-scoped volume — **not** a stratified sample) through the same shred/reassemble transform **plus a second independent reassembly** (so a transform bug surfaces as divergence, not identical-wrong hashes); a divergence ledger written continuously during dual-read.
4. Guaranteed-mirror mechanism: a **transactional outbox** (writes append an outbox row in the same Mongo write; a drainer applies to Convex at-least-once, idempotent upsert keyed by `by_payloadId`) — replacing best-effort dual-write reconciled-after-the-fact.

**Exit criteria:** transform re-runnable to clean parity; full per-collection checksum parity green; outbox drainer at-least-once + idempotent; `_versions`/media/external-ref remap covered.

---

## Phase 8 — Cutover with rollback (per-service, canary-tenant first)

**Goal:** flip read authority safely with a real rollback while Mongo stays authoritative.

**Key steps:**
1. **Dual-write (Phase A)** via the outbox, lowest-risk service first (session/identity), **explicitly not** shop/`findByDomain` first. Convex mirror non-authoritative; divergences→ledger.
2. **Dual-read shadow (Phase B):** read both, serve Mongo, accumulate divergence metrics until zero over a bake window. **Run shadow-billing here** (real both-backend traffic), instrumented per-tenant, measuring `findByDomain` edge cache-miss ratio on cold/long-tail tenants + dual-write/shadow-read overhead. A measured cost ceiling is a **go/no-go gate** for the flip.
3. **Flip read authority (Phase C)** by `(tenant × service)` — **canary-tenant first** (one low-traffic tenant), ratchet by cohort; per-tenant divergence metrics gate promotion. Rollback while dual-writing = flip the flag (genuine).
4. **Stop Mongo writes (Phase D)** per service once Convex has baked authoritative. Past this point flag-back is **data loss** — keep a tested reverse-ETL (Convex→Mongo) green for the authoritative window, **or** declare Phase D a one-way gate behind a hard go/no-go checklist (full parity + N-day bake + canary soak). Do **not** sell "instant flag-back" as the rollback past Phase C.
5. **Admin (Payload) cutover:** flip `PAYLOAD_DB=convex` in non-transactional mode, hook IO → `scheduler.runAfter(0, action)`, `totalDocs`→aggregate; the prod admin-boot healthcheck auto-reverts `db:` to `mongooseAdapter` on boot failure. CMS content read-flip only after the Phase 6 dual-read loader has baked.

**Exit criteria:** canary tenant flipped with zero divergence; cost ceiling met; reverse-ETL green (or one-way gate signed off); admin boots on Convex with healthcheck auto-revert armed.

---

## Phase 9 — Decommission & verification checklist

**Goal:** retire Mongo and confirm the migration's invariants hold.

**Final verification checklist:**
- [ ] `attachShopSync` and `packages/cms/src/shop-sync/*` deleted; no second shop/tenant table exists.
- [ ] Single canonical `shops` row is both shop and tenant; `shop.id` == `legacyId` (Convex `_id` never surfaced as `shop.id`).
- [ ] `packages/db` service signatures unchanged; all ~183 importers compile untouched.
- [ ] Public storefront bundle ships **zero** Convex client/WebSocket; `connect-src` allows the Convex origins.
- [ ] PPR prerender snapshot tests green for at least one PDP and the root layout; no `preloadQuery` runs during prerender.
- [ ] Revalidation bridge: durable retry + DLQ + reconciliation cron proven; HMAC dual-accept rotation tested; autosave never revalidates.
- [ ] RLS deny-default proven; barrel/lint gate CI-blocking; internal Payload collections served via `systemQuery`; subscription circuit breaker active.
- [ ] Admin-boot tripwire (build + init + create/edit + preferences + doc-lock) green on `PAYLOAD_DB=convex`; prod healthcheck auto-revert armed.
- [ ] Full per-collection checksum parity recorded at cutover; divergence ledger clean.
- [ ] `BoundedScanExceededError` / scan-budget guardrail proven on a ceiling-exceeding list; 1 MiB Lexical fixture round-trips.
- [ ] Shadow-billing cost ceiling met; per-tenant usage alerting wired; `convex export` cron to object storage running; self-hosted Convex green in CI.
- [ ] Reverse-ETL green OR Phase D one-way gate signed off.
- [ ] `@nordcom/commerce-test-mongo` retired **only after** `@nordcom/commerce-test-convex` proven green over a sustained CI window; `mongooseAdapter` kept flag-selectable through the bake.
- [ ] Changesets added for every touched non-ignored package.
