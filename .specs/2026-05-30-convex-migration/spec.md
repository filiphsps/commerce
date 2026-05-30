# Mongo → Convex Migration — Architecture & Mitigations Spec

## Decision context

The team has **committed** to a full MongoDB → Convex migration. This is no longer a should-we; it is a how-to-do-it-properly. The goal is a **single Convex source of truth with zero cross-store sync**: the Payload admin runs on a bespoke Convex `BaseDatabaseAdapter`, and the storefront + `packages/db` are rewritten native against the **same single Convex deployment**. Convex reactivity is integrated **deliberately and properly** — a designed surface map of reactive client islands vs cached-static SEO plus a real Convex→Next revalidation bridge — not the degraded "Mongo wrapped in `use cache`" strawman the prior exploration assumed.

Prior analysis (the catalogue of blockers this spec designs around): [`.specs/2026-05-30-mongo-convex-exploration/spec.md`](../2026-05-30-mongo-convex-exploration/spec.md).

This spec prefers the **adversarial hardening** over the original optimism wherever the two conflict. Where a prior mitigation was shown to be false (e.g. "reuse the existing `/api/revalidate` path exactly", "instant flag-back rollback", "coalesce create+createVersion into one mutation closes the orphan window"), the hardened design supersedes it and the residual is stated honestly.

---

## 1. Target architecture

### 1.1 One canonical Convex schema (shops/tenants collapsed)

Three shop representations exist **today**, not two, and must collapse into **one** Convex `shops` table:

1. Mongoose `shops` (`packages/db`, source of truth, ~176–183 importers, full design/theme/commerce/secrets/collaborators/featureFlags).
2. Payload `tenants` (mirror keyed `slug = shop.id` + `shopId`, drives `plugin-multi-tenant`).
3. Payload `shops` collection (`packages/cms/src/collections/shops.ts`, mirrors the editable Mongo surface for admin editing, with secret-guard hooks).

`attachShopSync` (`apps/admin/src/payload.config.ts:95` → `packages/cms/src/shop-sync/*`) is the **live** post-save glue between (1) and (2). It is **retired by construction**: once shop and tenant are one row, there is no second table to mirror.

**Canonical `shops` table** = shop AND tenant simultaneously. The `plugin-multi-tenant` `tenantsSlug` is repointed at `shops`; the tenant identity is the row's own `_id`. The former `tenants.slug`/`shopId` indirection is deleted. Supporting tables:

- `shopCredentials` (1:1, `by_shop`) — `commerceProvider.authentication.token`, `customers.clientSecret`. **Structural** credential shredding replaces read-time `docToOnlineShop` delete-key masking: the public `shops.byDomain` query physically cannot read this table (separate table + RLS deny), so secrets never enter the public wire payload.
- `shopDomains` (one row per `domain → shopId`, `by_domain`) — replaces the Mongoose `$or:[{domain},{alternativeDomains:domain}]` (Convex cannot index array membership). **Global uniqueness enforced at write time**; stale rows reconciled on domain-set shrink (see §5).
- `shopCollaborators` (`by_user`, `by_shop`) — de-embeds the collaborators array.
- `shopFeatureFlags` (`by_shop`) join + global `featureFlags` (`by_key`).
- `reviews` (`by_shop`) — `shopId` relationship on **both** storefront and Payload sides; the Mongoose embedded `ShopSchema` snapshot in `models/review.ts` is deleted, killing the denormalization-drift bug class structurally.
- Auth (platform-global, **not** tenant-scoped): `users` (`by_email`), `sessions` (`by_token`/`by_user`/`by_expiry`), `identities` (`by_provider_identity` unique).
- CMS content tables (Track B): `pages`, `articles`, `media`, per-collection `_versions`, per-collection `_i18n` shred tables, and the Payload **internal** collections `payload-preferences`, `payload-locked-documents`, `payload-migrations`, `payload-jobs`.

**ID contract:** preserve the legacy Mongo ObjectId as a `legacyId` field and project **it** to `shop.id`; never surface Convex's branded `_id` as `shop.id`. This keeps the ~183-importer string contract and all externally-persisted shop references (sessions, carts, Shopify metafields, ISR output) stable through the swap.

### 1.2 Payload-on-adapter for admin

A bespoke `convexAdapter` (`createDatabaseAdapter`) backs `/cms`. `buildPayloadConfig` selects `db:` from `PAYLOAD_DB=mongo|convex` (replacing the hardcoded `db: mongooseAdapter({ url: mongoUrl })` at `packages/cms/src/config/index.ts`). Minimal-Viable-Adapter, DEFER set, Where-AST→Convex compiler, non-transactional write model, localized shredding, and `generateSchema` codegen are detailed in §3 / Track B.

### 1.3 Native storefront

`packages/db` keeps **every** singleton (`Shop`, `Review`, `FeatureFlag`, `User`, `Session`, `Identity`) and **every** method signature identical — the ~183 importers do not change. Only the internals swap from the Mongoose `Service` base + `await mongoose.connect` to a lazy `ConvexHttpClient(process.env.CONVEX_URL)` calling deployed `convex/` functions. `import 'server-only'` is retained. The Mongoose `Document` intersection in `BaseDocument` flattens to a plain `{ id; createdAt; updatedAt }` (Convex `_id`/`_creationTime` projected to `id`/`createdAt` in the query layer, mirroring today's `stripInternals`).

**Correction (verified):** the middleware (`apps/storefront/src/middleware/storefront.ts`) imports the server-only `Shop` from `@nordcom/commerce-db` and calls `Shop.findByDomain`/`findAll` directly — it runs on the **Node** runtime with a warm pooled Mongo connection, **not Edge**. Therefore the Convex miss-path is a **new fresh HTTPS round-trip** to a single-region Convex deployment, **not** "net-neutral with Mongo's process cache". This is a measured regression risk, not a wash (see §5, residuals).

### 1.4 Multi-tenant RLS on one deployment

`tenantQuery`/`tenantMutation` = `convex-helpers` `customQuery(query, customCtx(...))` + `wrapDatabaseReader/Writer(ctx, ctx.db, tenantRules(shopId), {defaultPolicy:'deny'})`. `shopId` is pinned from **server-trusted** context (Convex auth identity for admin; server-resolved hostname→shopId for storefront), never a spoofable client arg. A `systemQuery`/`systemMutation` escape hatch serves crons, migrations, `resolveShop`, and the **non-tenant-scoped internal Payload collections** (preferences, locked-documents, migrations, jobs) plus legitimate super-user cross-tenant admin. Full design in §4.

---

## 2. Proper reactivity integration

### 2.1 The decision rule (surface classifier)

A surface becomes a **REACTIVE client island** iff **all three** hold:

1. Its data is per-visitor/per-session mutable state whose staleness is visible **within a single session** (cart, order status, a review you just posted), AND
2. It is **not** part of the prerendered SEO/crawlable payload (not indexed, not LCP-critical), AND
3. Convex is the **system of record** for that data.

Fail any clause → it stays **STATIC cached SEO**, kept fresh by the revalidation bridge, never by a subscription. Anonymous + crawlable + Shopify-owned data is **always** static.

### 2.2 The three lanes

| Lane | Surfaces | Mechanism | Freshness |
|---|---|---|---|
| **1 — Cached-static SEO** | product detail, collections, CMS pages/articles/header/footer/businessData, metadata, sitemaps, robots | RSC + `'use cache'` + `cacheTag`, read via `fetchQuery` (non-reactive) or existing cached loaders, **zero** Convex subscription | Convex→Next revalidation bridge (§2.4) |
| **2 — Reactive client islands** | account/orders, reviews "just-posted" + write confirmation, admin theme-editor live preview, admin lists, live inventory **only** on auth/interaction-gated views | `'use client'` + `preloadQuery`→`usePreloadedQuery` (snapshot-then-live) inside a dynamic PPR hole | Convex WebSocket |
| **3 — Edge resolution** | `findByDomain` in middleware | in-process TTL/LRU cache fronting a `ConvexHttpClient` `by_domain` one-shot — **never** a subscription | 60s TTL + bridge-driven `invalidateShop` |

### 2.3 preloadQuery → usePreloadedQuery that coexists with PPR / `use cache`

- Mount a thin `'use client'` `ConvexReactClient` provider **once** in the storefront root layout as a leaf boundary that **wraps children only and reads no request data** — so it does not force the layout dynamic and the PPR static shell (`CachedShell`) stays prerendered. Provider receives only the public deployment URL; **never** the auth token at provider root.
- The static/dynamic seam is a `<Suspense>` boundary. `preloadQuery` is `no-store`, so it **MUST NEVER** be called inside a `'use cache'` function — it is only ever called inside an RSC segment that **already touches request data** (`cookies()`/auth), i.e. inside the dynamic PPR hole. The surrounding `'use cache'` SEO body prerenders normally; the island is excluded from the prerender and streamed at request time with its Suspense fallback baked into the static shell.
- The dynamic segment calls `preloadQuery(api.x, args, { headers: { 'Convex-Auth': token } })` and passes the serializable `Preloaded<T>` handle as a prop to a `'use client'` child that calls `usePreloadedQuery` — hydrating from the server snapshot, then subscribing over the WebSocket. **`usePreloadedQuery` rendering the snapshot when the socket is down is the explicit, tested degraded contract** (no infinite spinner). A per-surface kill switch (env/flag) downgrades each island to its preloaded snapshot when Convex degrades — this is Track A's real rollback.

### 2.4 The Convex → Next revalidation bridge (designed durable)

**Corrected from the strawman:** the existing route (`apps/storefront/src/app/[domain]/api/revalidate/route.ts`) is hardwired to Shopify — it verifies `x-shopify-hmac-sha256`, parses `x-shopify-topic`, is tenant-scoped by the `[domain]` URL path, and does **not** call `revalidateTag` directly (it goes through a cache abstraction with a `tenantRootTags` taxonomy). Only the **tail** (`cache.invalidate.tenant` / `cache.invalidateRaw(tags)` / `evictApolloClient`) is reusable.

Therefore:

- Build a **dedicated** `/api/revalidate/convex` route (or discriminated branch) with its own HMAC secret and a CMS-publish body schema. **Verify HMAC FIRST**, before any tenant lookup, to avoid a `findByDomain` DoS vector on every publish. Share only the tail. Leave the Shopify branch untouched.
- A Convex **publish** mutation (status transition to `published` — **never** the 2s autosave/draft stream) calls `ctx.scheduler.runAfter(debounceMs, internal.revalidate.notify, {tenantId, tags, eventId, ts})` post-commit. `tags` are computed **inside Convex** (where the write happened) via a publish-event→tags derivation function (the analog of `parseShopifyWebhook`) that reuses the existing `tenantRootTags`/`_loaders.ts` taxonomy — so the bridge does **NOT** call back through the flagged `Shop.findByDomain` to derive tags (avoids the circular dependency during cutover).
- `notify` resolves the per-tenant storefront URL from the unified record's primary-domain field (with explicit custom-vs-platform-domain handling), POSTs HMAC-signed, and emits one broad-sweep to the tenant root plus specific tags.
- **Durable delivery, not best-effort.** Route the notify through `@convex-dev/action-retrier` (or a workpool): the action **THROWS on any non-2xx** so retries trigger (the storefront route already signals retryability via `503` + `Retry-After`); bounded exponential backoff; dead-letter table + alert. Plus a low-frequency **reconciliation cron** that broad-sweeps each tenant root so any permanently-lost event self-heals within minutes (incremental — replay of tags written since last successful POST, rate-limited to avoid an origin stampede — **not** a global full-revalidate of every tag for every tenant).
- **Idempotency:** dedup by `eventId` (avoids redundant Apollo-pool eviction churn); `revalidateTag` is itself idempotent. Reject stale `ts` (replay window). Debounce coalesces via a per-`(tenant,collection)` pending-revalidation doc so a draft stream never triggers revalidation.
- **Secret handling (corrected):** `experimental_taintUniqueValue` is a React/Next RSC primitive — Convex env/action runtime has **no taint**. The secret lives in Convex env + Next env; rotate via a **dual-accept window** verifying against `{current, previous}` for N minutes. Keep Next-side taint only where the secret is read in an RSC.

### 2.5 Public-reactive (e.g. live inventory) without a public WebSocket-per-visitor

The prerendered SEO body renders a **cached availability snapshot** (Shopify/cached read) as the real crawlable content. A thin island upgrades to live via `useQuery` **only behind auth or explicit interaction**; the socket disconnects on tab-hidden. Anonymous crawlers/idle visitors never open a socket. **The live number is advisory UI only** — the buy action re-validates against Shopify (system of record) at mutation time, preventing oversell-display correctness bugs.

### 2.6 Surface classifier map (SFREAD-10)

The §2.1 decision rule applied to every storefront App Router segment (`apps/storefront/src/app/**`). A segment is a **Lane-2 reactive island iff all three** clauses hold; failing **any** clause keeps it **Lane-1 static-SEO**. Each row records all three clauses (C1 per-session mutable + staleness visible within a session · C2 not part of the prerendered SEO/crawlable payload · C3 Convex is system of record) and the resulting lane.

**Result: 22 Lane-1 static-SEO App Router segments (+ 1 cross-cutting surface — the theme-preview, which is not an `app/**` route segment), 2 Lane-2 reactive islands.** Server-only route handlers (`api/*`, `robots.txt`, `sitemap*`, icon routes, `flags`) emit **no browser chunk** and are Lane-1 by construction (server-side Convex usage there is permitted; only the client bundle must be Convex-free).

| Route segment | Lane | C1 per-session mutable | C2 not crawlable SEO | C3 Convex SoR | Justification |
|---|---|---|---|---|---|
| `[domain]/[locale]` (tenant shell layout: header/footer/businessData) | **1** | no | no | no | Shop-wide CMS chrome, anonymous and identical across sessions; it is the prerendered SEO shell; Convex feeds it via the revalidation bridge, not a subscription. All three fail → static. |
| `[domain]/[locale]/[...slug]` (CMS pages) | **1** | no | no | no | Anonymous published page content; the canonical crawlable/indexed payload; eventually-consistent via the publish→bridge path. → static. |
| `[domain]/[locale]/products` (index) | **1** | no | no | no | Anonymous catalog listing; crawlable index; Shopify owns the catalog. → static. |
| `[domain]/[locale]/products/[handle]` (PDP) | **1** | no | no | no | Anonymous product content; the LCP-critical indexed SEO page; Shopify is SoR for product/price/inventory. → static (live inventory upgrade is an interaction-gated island per §2.5; the page itself is static). |
| `…/products/[handle]/@description` slot | **1** | no | no | no | Prerendered PDP fragment; crawlable; Shopify-owned copy. → static. |
| `…/products/[handle]/@details` slot | **1** | no | no | no | Prerendered PDP fragment; crawlable; Shopify-owned. → static. |
| `…/products/[handle]/@gallery` slot | **1** | no | no | no | LCP imagery, prerendered + crawlable; Shopify media. → static. |
| `…/products/[handle]/@recommendations` slot | **1** | no | no | no | Cached recommendation set, not per-session; crawlable; Shopify-derived. → static. |
| `[domain]/[locale]/collections/[handle]` | **1** | no | no | no | Anonymous collection listing; indexed; Shopify-owned. → static. |
| `[domain]/[locale]/blogs/[blog]` (blog index) | **1** | no | no | no | Anonymous published blog index; crawlable; bridge-refreshed CMS content. → static. |
| `[domain]/[locale]/blogs/[blog]/[handle]` (article) | **1** | no | no | no | Anonymous published article; the canonical indexed payload; bridge-refreshed. → static. |
| `[domain]/[locale]/search` | **1** | no | no | no | Query-driven results rendered from the Shopify Storefront API; crawlable shell; Shopify SoR. → static. |
| `[domain]/[locale]/countries` | **1** | no | no | no | Locale/country switcher built from the shop record's locale set; not per-session; crawlable; bridge-refreshed. → static. |
| `[domain]/[locale]/cart` | **1** | yes | no | **no** | Cart is the archetypal per-session mutable surface (C1 holds, per §2.1), but **cart/inventory are Shopify system-of-record**, surfaced via the Storefront API — not Convex per-session state; the route renders a crawlable shell and the live line total is **advisory UI** re-validated against Shopify at checkout. Mirroring it into Convex would re-introduce the dual-source-of-truth this migration kills (§6 non-goal). **C3 fails → static**. |
| `[domain]/[locale]/@modal` (parallel slot) | **1** | no | no | no | Default slot renders `null`; intercept content reuses the static product/collection surfaces. → static. |
| `[domain]/sitemap.xml` + `sitemaps/**` (`blogs.xml`, `collections.xml`, `products.xml`, `pages.xml`) | **1** | no | no | no | Server-rendered crawler payloads, no browser chunk; Shopify/CMS-derived. → static. |
| `[domain]/robots.txt` | **1** | no | no | no | Server-rendered crawler directive, no browser chunk. → static. |
| `[domain]/apple-icon` · `favicon.ico` · `favicon.png` | **1** | no | no | no | Static asset routes, no browser chunk. → static. |
| `.well-known/vercel/flags` (route) | **1** | no | no | no | Server-side flags discovery endpoint, no browser chunk. → static. |
| `[domain]/api/revalidate` (route) | **1** | n/a | n/a | n/a | Server-only Shopify-HMAC webhook handler; no browser bundle; server-side store access is permitted. → static (server). |
| `[domain]/api/cms-preview` (route) | **1** | n/a | n/a | n/a | Server-only `draftMode()` toggle; no browser bundle. → static (server). |
| `[domain]/api/auth/[...nextauth]` (route) | **1** | n/a | n/a | n/a | Server-only auth handler; no browser bundle; sessions live server-side. → static (server). |
| Theme-preview surface (storefront rendered inside the admin theme editor) | **1** | **no** | yes | **no** | **Single-editor**: one editor edits a draft at a time, so there is no cross-session staleness on the *storefront* surface requiring a public subscription — the live edit loop is driven by the admin theme-editor island (`apps/admin`, Lane-2) over `draftMode()`, not a storefront-side Convex socket. The saved theme is the system of record and the preview is **advisory**. C1 and C3 fail on the storefront surface → **static**; reactivity stays in admin, outside the storefront public bundle. |
| `[domain]/[locale]/account` (+ `account/layout`) | **2** | **yes** | **yes** | **yes** | Profile + "just-posted" state is per-session mutable with staleness visible within the session; auth-gated and `noindex`, never crawlable; Convex is SoR for users/sessions/reviews. All three hold → **reactive island** (`preloadQuery`→`usePreloadedQuery` inside a dynamic PPR hole; Shopify-owned order data shown there stays advisory/static). |
| Reviews "just-posted" confirmation island (interaction/auth-gated component embedded in the static PDP) | **2** | **yes** | **yes** | **yes** | A review the visitor just posted is per-session mutable with in-session staleness; the island is interaction/auth-gated and excluded from the prerendered crawlable body; Convex owns `reviews`. All three hold → **reactive island**; the surrounding PDP and the crawlable aggregate-rating snapshot remain Lane-1 static. |

**Load-bearing contract for SFREAD-07.** The §5 CSP guardrail — enforced by `scripts/assert-no-convex-public-bundle.ts` — scans the storefront client bundle (`apps/storefront/.next/static`) and fails the build on any Convex client/WSS reference. It passes **trivially today** (no provider mounted) and becomes load-bearing once SFREAD-07 mounts the `ConvexReactClient` provider (§2.3). Because the guard treats the whole scanned chunk set as "the public bundle," SFREAD-07 must keep the Lane-2 island Convex code **out of that scanned set for the anonymous/non-draft experience** — i.e. confine the provider + islands to `draftMode()`/auth-gated, code-split chunks, and/or narrow this guard's target to the anonymous-route chunk set when the islands land. The two Lane-2 storefront surfaces above are the **only** segments permitted to carry Convex client code, and only behind that gating.

---

## 3. Blocker → Mitigation → Residual (all 12 painpoints)

| # | Blocker | Mitigation (hardened) | Residual (accepted) |
|---|---|---|---|
| 1 | Reactivity "void" on RSC/PPR — `preloadQuery` is `no-store` & collides with `cacheComponents`/`use cache`/PPR; `fetchQuery` non-reactive; Convex can't trigger `revalidateTag` | Surface partition (§2.2): `preloadQuery` confined to dynamic PPR holes, never in `use cache`; static SEO uses cached loaders/`fetchQuery` refreshed by the **durable** Convex→Next HMAC bridge (§2.4). `usePreloadedQuery` gives snapshot-then-live | Auth islands are intentionally dynamic PPR holes (not fully prerendered); SEO surfaces are eventually-consistent (publish visible after debounce + propagation — seconds) |
| 2 | Bespoke ~40-method Payload adapter, zero prior art, single owner, "admin doesn't boot" | MVA-first; deferred-but-required methods **throw typed `NotImplementedError`** (never silent no-op); exact-pin Payload `3.85.0`; contract test reflecting over installed `BaseDatabaseAdapter`; Payload shared adapter integration suite vs Convex in CI; **admin-boot tripwire** (`next build` + `payload init` + headless create/edit of a `pages` doc, **plus** preferences read/write + doc-lock acquire/release) gating merge; prod admin-boot healthcheck auto-reverts `db:` flag to `mongooseAdapter` on boot failure | Bus factor reduced not removed; a Payload minor bump can still break a deferred-method assumption; pinning blocks security upgrades until re-verified |
| 3 | No faithful Convex mapping for interactive transactions; orphan-`_versions` window | `beginTransaction`→`null` (Payload's sanctioned non-txn mode, already how it runs on standalone Mongo); atomic unit = one IO-free Convex mutation; hook external IO → `scheduler.runAfter(0, action)` post-commit; `attachShopSync` **retired** (not reimplemented); orphan self-heal on re-save + cron sweeper repairing missing `_versions`/drifted `latestVersionId` **and** drifted aggregate counts **and** orphaned side-rows. **Honest correction:** create+createVersion arrive as **two** adapter round-trips and Payload snapshots the version at a different lifecycle point, so coalescing only buys atomicity *within* one call — a pre-synthesized version can diverge; define `createVersion` dedup/reconcile semantics explicitly and assert "one version row == Payload's post-hook snapshot" in a contract test | A short, **recoverable** orphan/pointer-drift window persists between a rare cross-call partial write and the next re-save or sweeper pass. Cross-document atomicity is genuinely surrendered (no money/inventory at this layer) |
| 4 | Runtime-arbitrary Where-AST + sort over index-only Convex; `contains`/`like` need search indexes; permanent scaling ceiling | Compile Where-AST → `withIndex` equality-prefix + single trailing range bound, residual as bounded `.filter()` over the narrowed range; `contains`/`like` → dedicated `searchIndex` (search-first, bounded post-filter); tenant-prefixed compound indexes via codegen; scan-budget guardrail throws typed `BoundedScanExceededError` before the **32k-doc / 16 MiB** per-txn ceiling | Permanent leaky ceiling: `contains`/`like` can't compose with arbitrary range filters; a selective filter over a large narrowed range **throws** rather than degrading gracefully (admin-UX break on collections that grow); every new filterable field is a schema+deploy event |
| 5 | Scan ceilings 32k / 16 MiB; lists tenant-scoped/page-bounded; `totalDocs` via aggregate | Admin lists tenant-scoped + page-bounded by `plugin-multi-tenant`; `count`/`totalDocs` via `@get-convex/aggregate`; **offset→cursor:** aggregate also serves `aggregate.at(offset)` to derive the page-N cursor (cap max addressable page, typed error past it) — Convex has no skip/offset | **Aggregate is a denormalization** updated inside the coalesced mutation → drifts like `latestVersionId` under non-txn writes; needs the same sweeper. Deep paging beyond the cap is refused, not walked |
| 6 | Static Convex schema vs dynamic Payload config | `generateSchema` emits `convex/schema.ts` (tables + `_versions` + `_i18n` + internal collections + tenant-prefixed/`by_payloadId`/`by_parent` indexes); `pnpm cms:schema:gen` (generate→`convex deploy`); CI `cms:schema:gen:check` drift gate mirroring `cms:gen:check`; **expand/contract protocol** (add-optional → backfill → tighten) with a deploy **dry-run** validating existing rows before promotion + a backfill mutation runner (substitutes for the deferred migrate CLI) | DX regresses from edit-config-and-restart to codegen+deploy; a tightening deploy can reject existing rows; codegen must stay in lockstep or queries silently scan |
| 7 | 1 MiB doc cap vs all-locales-in-one-doc localized Lexical | Shred large localized richtext/blocks into `<coll>_i18n` keyed `(parentPayloadId, fieldPath, locale)`; small scalars inline; reassemble on read via `by_parent_field`; compiler **hard-rejects** any where/sort on a shredded field at compile time; reject at schema-gen (typed error) any collection whose worst-case **pre-shred mutation argument** would exceed Convex's per-call arg-size limit | Read fan-out into N side-row lookups per localized field; shredded richtext permanently un-queryable; **write-path correction:** Payload hands the adapter the whole doc, so a maximally-localized write can hit the per-call arg limit; host-side shred into inline-doc + side-rows re-introduces partial-localized-write risk — covered by the side-row sweep |
| 8 | Autosave interval=2000 OCC contention | Accept; load-test required, **not asserted.** Write amplification is real: each 2s autosave writes the version row **and** patches `latestVersionId` **and** updates the aggregate, all touching the same parent index across 7 autosaving collections — widens the OCC conflict surface | Unproven on the Convex engine until the concurrent-autosave OCC integration test runs; mitigable/low at current concurrency |
| 9 | ~176–183 importers behind `packages/db` seam; `findByDomain` round-trip regression | Hold service-seam signatures constant (internals swap to `ConvexHttpClient`); keep `shop-cache.ts` TTL/LRU (60s/2.5s neg/1000 max) so hit path is in-process zero-network; swap the **loaders** (the closures `resolveShopSummary`/`resolveShopLocales` in `apps/storefront/src/middleware/storefront.ts`, **not** `shop-cache.ts` which is loader-agnostic); a `shops.byDomainWithCredentials` `systemQuery` serves the credentialed hot path | **Corrected:** middleware is Node, not Edge; miss-path is a fresh HTTPS round-trip to a single-region Convex (possible cold start, cross-region latency) — a real regression to **benchmark p50/p99** and gate before flip, not a wash. Bound by TTL/LRU; needs `invalidateShop` wired to the bridge or an admin domain/locale edit is stale up to 60s per process |
| 10 | Cross-tenant bleed on one deployment | `tenantQuery`/`tenantMutation` over RLS `defaultPolicy:'deny'` + tenant-prefixed compound indexes + a **CI-enforced** barrel/lint gate forbidding raw `query`/`mutation` in app modules; `systemQuery`/`systemMutation` escape hatch for crons/migrations/`resolveShop`/internal-Payload-collections/super-user; app-level **subscription registry + circuit breaker** in the wrappers (Convex has no native per-tenant cap) | Discipline burden on the gate (must be CI-enforced, not advisory); public reads still trust the server-resolved hostname; subscription cap is net-new code, not a config knob |
| 11 | **PREREQUISITE:** three divergent shop/tenant reps + live `attachShopSync` + divergent review shapes | Land schema unification **FIRST and on Mongo** (datastore-agnostic): collapse Mongoose `shops` + Payload `tenants` + Payload `shops` into one canonical record (tenant identity = row id), delete `attachShopSync` (`payload.config.ts:95` + `packages/cms/src/shop-sync/*`), convert reviews to a `shopId` relationship on both sides and drop the embedded `ShopSchema` snapshot; rewrite `resolveTenantId` call sites + `where:{tenant:{equals}}` filters; ship + data-migrate, **then** swap the store | Reviews backfill rewrites every embedded snapshot to a relationship; collaborators move embedded-array→join table (migrates `findByCollaborator` shape); the `tenantsSlug` repoint to an opaque-id key must be spiked **before** Phase 1 lands |
| 12 | Lock-in + metered cost on a public storefront | Self-host the open-source Convex backend for CI/e2e + as the production exit; scheduled `convex export` snapshots to object storage; all access behind the `packages/db` seam + the Payload adapter seam (exit = re-implement **two** adapters, not 176 call sites); keep `mongooseAdapter` flag-selectable through the transition. **Cost:** no public subscriptions; calls scale with write-rate + cache-miss-rate + build fan-out (paginated/batched with a per-build call cap), **not** raw traffic; per-tenant usage alerting | Adapter-maintenance cost is **not** bounded by self-host/export (only the data exit is); storefront still couples to Convex's proprietary function API (full exit = rewrite); edge cache-miss is a billed round-trip on the hottest path — a low hit-ratio on cold/long-tail tenants erodes the model; **shadow-billing on production-shaped traffic is a go/no-go gate, not an afterthought** |

---

## 4. Multi-tenancy enforcement design

- **Wrappers:** `tenantQuery`/`tenantMutation` via `convex-helpers` `customQuery(query, customCtx(...))` composing `wrapDatabaseReader/Writer(ctx, ctx.db, tenantRules(shopId), {defaultPolicy:'deny'})`. Fail-closed: a table with no explicit rule is denied.
- **shopId provenance:** pinned in `customCtx` from Convex auth identity (admin) or server-resolved hostname→shopId (storefront, which the middleware already owns). **Never** a spoofable client arg on mutations or sensitive reads.
- **Index discipline:** every tenant-scoped query opens `.withIndex('by_shop_…', q => q.eq('shopId', ctx.shopId)…)` so isolation is range-bounded, not just predicate-filtered.
- **Escape hatch:** `systemQuery`/`systemMutation` for crons, migrations, `resolveShop`, the **non-tenant-scoped internal Payload collections** (`payload-preferences`, `payload-locked-documents`, `payload-migrations`, `payload-jobs`), platform-global auth tables, and legitimate super-user cross-tenant admin. These are explicitly exempt from the deny-default — without this the admin does not boot (preferences read/write on every view; locked-documents on every edit).
- **Enforcement:** a CI-enforced barrel (app modules import only `tenantQuery`/`tenantMutation`/`systemQuery`; raw `query`/`mutation` are not re-exported) + a Biome rule. A raw import around the barrel silently bypasses RLS, so the gate is **CI-blocking**, not advisory.
- **Subscription registry + circuit breaker** built into the wrappers: stop opening new sockets past a per-tenant threshold, fall back to snapshot+poll, emit the per-tenant cost metric.

## 5. Lock-in & cost guardrails

- **Lock-in containment by construction:** self-hosted open-source Convex in CI/e2e and as the standing production exit; cron `convex export` snapshots to object storage; two-seam access (the `packages/db` service seam + the Payload adapter seam); `mongooseAdapter` flag-selectable per service for the whole transition. The **data** exit is bounded; the **adapter-maintenance** liability is not — track it explicitly.
- **Cost model:** storefront Convex calls = (write rate driving revalidations) + (cache-miss rate) + (build fan-out: N tenants × M params), **not** raw visitor count, because Lane-1 is cache-first with **no public subscriptions** and the WebSocket disconnects on tab-hidden. Build fan-out batched through paginated queries / a `convex export` snapshot read with a hard per-build call cap; ISR (`dynamicParams:true`) shifts cost from build burst to first-request latency.
- **Hot-path guards:** edge `findByDomain` stays a cached read (never a subscription); `shopDomains.domain` is globally unique at write time and `.unique()` is wrapped to degrade to a deterministic logged first-match instead of throwing site-wide; stale `shopDomains` rows are reconciled (delete-diff) inside the same write mutation when a shop's domain set shrinks, preventing cross-tenant routing.
- **CSP:** add the Convex WSS + HTTPS origin to `connect-src`; assert in CI that the **public** (non-draft) storefront ships **zero** Convex client/WebSocket (preview reactivity is code-split and strictly `draftMode()`/auth-gated).

## 6. Non-goals & accepted residual risks

- **Not** preserving cross-document interactive transactions. The atomic unit is one IO-free Convex mutation; cross-call atomicity is surrendered (recoverable orphan window, no money/inventory at this layer).
- **Not** instantaneous CMS-publish→storefront visibility. Lane-1 is eventually-consistent at debounce + propagation latency (same class as today's Payload-write→revalidate path).
- **Not** free-text admin search parity. `contains`/`like` are weaker than Mongo regex and can't compose with range filters; large un-indexed admin filters **throw** (`BoundedScanExceededError`) rather than degrade.
- **Not** "instant flag-back rollback" after the point-of-no-return. `PAYLOAD_DB`/`DB_BACKEND_*` flags give **code** rollback only while Mongo is still authoritative (dual-write phases). Past the cutover gate, recovery requires the reverse-ETL or is data loss — declared explicitly per phase in the plan.
- **Not** reactive cart/inventory against Convex. Shopify remains system of record; mirroring them into Convex for reactivity (without Convex owning them) would re-introduce the exact dual-source-of-truth divergence this migration kills.
- **Accepted standing liabilities:** the bespoke adapter tracking Payload 3.85's fast-churning private DB interface (single-owner bus factor); the Where→index compiler's permanent scaling ceiling; localized richtext being permanently un-queryable; per-tenant metered cost on a public storefront; a new bridge moving-part with secret rotation and at-least-once (now durable) delivery.
