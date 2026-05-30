# MongoDB → Convex: Migration Exploration

> **Revision 3 (2026-05-30) — read first.** The user challenged the Rev-2 "don't migrate" verdict, arguing a **FULL rip-and-replace** (Payload admin on a custom Convex adapter **+** the storefront native on Convex) dissolves sync because there is then truly one database and one schema. This reframe is **legitimate and Rev-2 under-weighted it.** The Rev-3 block below re-adjudicates the full-replace specifically, corrects two Rev-2 blockers that do NOT survive scrutiny (interactive transactions and scan ceilings were both over-stated as fatal), and still lands on **no** — not because the migration is infeasible, but because a strictly dominating alternative (unify the schema on the existing Mongo) captures the same durable wins at a fraction of the cost and risk. See **§0** immediately below.
>
> **Revision 2 (2026-05-30).** The user added a hard constraint — **they never want two databases kept in sync** — and asked two new questions: (a) is a custom Convex *Payload database adapter* realistic enough to make Convex the single source of truth for **both** the Payload admin and the storefront, dissolving the original BLOCKER#1 (dual-DB); and (b) what is the easiest way to solve multi-tenant isolation (the original BLOCKER#2) in a single-Convex world.
>
> Sections **1–5 are NEW / UPDATED** and supersede the old verdict where they conflict. Sections **6–10 are the ORIGINAL analysis, preserved** (renumbered) because it remains valid for the reactivity/RSC/cost dimensions the new questions don't touch. Where the original said "BLOCKER#1 / BLOCKER#2," read the revised treatment in §1–§3 first.

---

## 0. Revision 3 — Full Rip-and-Replace Verdict (NEW)

> Scope of this section: the **both-layers** move only — Payload admin on a bespoke Convex `BaseDatabaseAdapter` **and** the storefront/`packages/db` layer rewritten native on the same Convex deployment. This is a different proposal from the adapter-alone case Rev-2 rejected, and it deserves — and gets — a fresh adjudication.

### 0.1 Rev-3 verdict

**No to the full Convex rip-and-replace — but for a corrected reason, and with two Rev-2 blockers explicitly retracted.**

This is **not** a rubber-stamp of Rev-2. The full-replace reframe is honest and materially stronger than the adapter-alone case: it dissolves Rev-2's load-bearing objection ("the adapter still leaves `packages/db` on Mongo → two databases") **by construction**, and two of Rev-2's headline blockers do not survive scrutiny under it (see §0.3). The migration is **feasible in a degraded-but-acceptable mode**. It still loses — decisively — because a strictly dominating alternative exists on every axis the judges were asked to optimize: **unify onto a single schema/ORM over the existing Mongo** captures the same structural wins (sync gone, one canonical schema, one harness) for a fraction of the cost, with zero new lock-in and no bet-the-platform failure mode.

**Judge-panel consensus: unanimous `no` (3/3)** — across the pragmatic-shipper, risk-correctness, and staff-architect lenses. **Notable agreement, not just verdict:** all three independently credit the reframe as real, credit that non-transactional mode is acceptable here, and converge on the *same* killer risk (the bespoke zero-prior-art adapter) and the *same* dominating alternative (single-ORM-on-Mongo).

**Dissent / strongest minority position to record honestly:** Research Tasks B and D (the two deepest adapter-feasibility investigations) both land at **"buildable, not fatal"** — none of the residual blockers is strictly FATAL at this app's tenant-scoped volumes; the real limits are ~32k docs / 16 MiB per transaction (Rev-2 was ~2× too pessimistic at 16k/8 MiB), admin lists are tenant-scoped and stay far under that, `totalDocs` has a first-class fix (`@get-convex/aggregate`), and non-transactional mode is Payload-first-class. So the honest framing is **"can-build / shouldn't-build,"** not "can't-build." If leadership's priority were reactivity-as-a-product-bet rather than cost/risk discipline, this would flip to **prototype-first**, not `no`. It does not flip here because the cited product win (reactivity) is largely **void on this storefront** (§0.2).

### 0.2 What the full-replace genuinely fixes (Rev-2 under-credited these)

Rev-2 treated the reframe as "relocating" the problem. That was unfair on four points the both-layers move *does* deliver:

1. **Sync is truly gone, not shrunk.** With `shops`/`tenants` collapsed into one canonical table read by both admin and storefront, the `attachShopSync` post-save hook (`packages/cms/src/shop-sync/post-save-hook.ts`), its mirror collection, and the eventual-consistency window all disappear by construction — not by discipline.
2. **One schema retires the divergent-shape bug class.** Today reviews embed a full `ShopSchema` snapshot in Mongoose (`packages/db/src/models/review.ts`) but hold a `relationship` id in Payload (`packages/cms/src/collections/reviews.ts`). One Convex schema *forces* a single representation — the denormalization-drift hazard is structurally eliminated, not just managed.
3. **One dev/test harness replaces two.** The in-process `@nordcom/commerce-test-mongo` lifecycle **and** Payload's own Mongo lifecycle collapse into a single local Convex backend + schema-as-code.
4. **Native ACID where there is literally none today.** Cross-ORM writes (shop + tenant + reviews) cannot currently be atomic across Mongoose and Payload. Convex mutations are doc-confirmed ACID; the app's real atomic unit (content doc + `_versions` row + relationship writes) is pure DB IO that **fits inside one Convex mutation**, with hook external-IO moved to `scheduler.runAfter(0, action)` (post-commit). This is genuinely cleaner than today's fire-and-forget hooks.

These are real. The problem is **none of them is unique to Convex** — items 1–3 are equally delivered by collapsing to one ORM over the existing Mongo, and item 4's atomicity is available on Mongo via a replica set if ever needed.

**Reactivity — the one thing only Convex offers — does not land here.** The storefront is RSC / `cacheComponents:true` / PPR / `'use cache'` / tag-revalidation. `preloadQuery` is `no-store` and `fetchQuery` is non-reactive, so Convex on the SEO surface degrades to "Mongo wrapped in `'use cache'`" **and** you additionally owe a hand-built Convex→Next `revalidateTag` bridge (Convex cannot trigger tag revalidation). Reactivity pays only on the small interactive admin surface (theme-editor live preview) — real, but not platform-rewrite justification.

### 0.3 Residual blockers after mitigations — reclassified for the full-replace

| Rev-2 blocker | Status under FULL replace | Why |
|---|---|---|
| Dual-DB / "still two databases" | **DISSOLVED** | One physical store by construction; this was Rev-2's whole verdict and it is gone. |
| **Interactive transactions (Rev-2 called this BLOCKER/fatal)** | **DISSOLVED — Rev-2 over-stated it.** | Payload supports `transactionOptions:false` first-class; standalone Mongo already runs non-transactionally; no `transactionOptions` is configured here. The app's atomic unit fits ONE IO-free mutation; hook IO moves to `scheduler.runAfter(0)`. Failure mode = a rare recoverable orphan-`_versions` window that self-heals on re-save — **not corruption**, no money/inventory at this layer. A *faithful* begin/commit adapter is still infeasible; that just doesn't matter for write correctness here. |
| **Scan ceilings vs admin lists / `totalDocs` (Rev-2 HIGH)** | **MITIGABLE — Rev-2 ~2× too pessimistic.** | Real limit is **32k docs / 16 MiB** per transaction, not 16k/8 MiB. Admin lists are tenant-scoped via `plugin-multi-tenant` + `(tenant, slug)` indexes → page-bounded, far under the ceiling. `totalDocs` is the only count that can hit it, solved by `@get-convex/aggregate`. |
| Autosave (2s) OCC contention | **MITIGABLE / LOW** | One editor → one draft doc every 2s is serial; Convex auto-retries OCC; each autosave writes a *separate* `_versions` row, so the hot doc is just that editor's draft. Non-issue at this concurrency. |
| Static-schema ↔ dynamic Payload config | **MITIGABLE-WITH-COST** | `generateSchema` is a sanctioned adapter hook; codegen `schema.ts` + `convex deploy` in CI turns config edits into a CI step. DX cost, not a hard blocker. |
| Runtime-arbitrary `where`/sort over index-only engine | **MITIGABLE-WITH-COST (permanent leaky ceiling)** | You must write a compiler from Payload's runtime `Where` AST + arbitrary sort onto Convex index selection with a bounded-scan fallback; `contains`/`like` need search indexes that don't compose with arbitrary filters. Works at current volumes; carries a permanent scaling ceiling. This is the leakiest part of the adapter. |
| 1 MiB doc cap vs all-locales-in-one-doc localized Lexical | **MITIGABLE-WITH-COST (medium)** | Narrow edge for very large multi-locale richtext; mitigation is a locale/field-splitting shred-and-reassemble layer that *fights* the query compiler (you can't index a field that lives in a side row). |
| ~40-method adapter surface, **zero prior art**, Payload internal-API churn | **RESIDUAL — the real killer.** | Not FATAL to feasibility, but a bespoke, single-owner, forever-maintained adapter tracking Payload 3.85's fast-churning private DB interface, whose live failure mode is **"admin doesn't boot."** No community to fork or co-maintain. This, not transactions, is what sinks the proposal. |

**Crux resolved concretely:** the two Rev-2 cruxes both fail to survive the full-replace as fatal. (1) The transaction gap is fatal only to a *faithful* begin/commit adapter — irrelevant to write correctness because the content write fits one mutation and hook IO schedules post-commit. (2) The scan ceiling is non-binding because every admin query is tenant-scoped and page-bounded under the corrected 32k/16 MiB limit, with `totalDocs` offloaded to the aggregate component. **What remains is not a feasibility wall — it is a cost/lock-in/maintenance wall**, and that is decisive against the proposal precisely because the alternative below has neither.

### 0.4 If proceeding anyway: the migration shape

Recorded so a future decision isn't re-derived from scratch. Order of operations:

1. **Kill-criteria spike FIRST (days, throwaway).** Build only `find`/`findOne`/`create`/`updateOne` + the version surface (`createVersion`/`queryDrafts`/`findVersions`) for ONE collection — `pages` (versioned + localized + Lexical + 2s-autosave: it exercises every fatal seam at once). Stub `beginTransaction → null`. Seed a real multi-locale Lexical page pushed to the 1 MiB boundary and an offset-pagination admin list. **Stop if:** the `Where`→index compiler can't keep a representative admin list off an unbounded scan; `queryDrafts` needs full-table aggregation; the localized page exceeds 1 MiB; or `totalDocs`/offset pagination can't be served within budget. The analysis predicts the compiler + doc-shredding are where it dies if it dies.
2. **Adapter for admin (only if the spike holds).** Implement the full ~40-method surface in **non-transactional mode**; move every hook's external IO (`attachShopSync`, S3 upload, Resend) to `scheduler.runAfter(0, action)`; wire `generateSchema` → CI `convex deploy`; adopt `@get-convex/aggregate` for `totalDocs`.
3. **Native for storefront.** Rewrite `packages/db` (~176–183 importers) behind its existing thin centralized service seam so most call sites stay unchanged. `findByDomain` → a `by_domain` index (`alternativeDomains` normalized to one-row-per-domain). Keep the backend-agnostic in-process TTL/LRU edge cache untouched. Build the **Convex→Next `revalidateTag` bridge** and audit every per-request read into `'use cache'` for the prerender clock guard. Multi-tenancy via the §3 `tenantQuery`/`tenantMutation` RLS wrappers.
4. **Cutover:** schema-unification (§0.5 / §4) lands *first and on Mongo* regardless — it's a prerequisite either way — so the Convex move becomes a datastore swap under an already-unified schema, not a simultaneous schema-and-store big-bang.

### 0.5 Honest comparison: full-Convex-replace vs unify-schema-on-Mongo

| | **Full Convex rip-and-replace** | **Unify schema on existing Mongo** |
|---|---|---|
| Kills sync hook + divergent shapes | Yes | **Yes** (same structural win) |
| One canonical schema / one harness | Yes | **Yes** |
| Cross-entity atomicity | Native (non-txn mode; one-mutation unit) | Available via replica set if needed |
| Reactivity | Real on admin, **void on cached storefront** | N/A (not needed) |
| New lock-in | **High** (proprietary hosted backend + bespoke adapter) | **None** (self-hostable Mongo retained) |
| Net-new maintenance liability | **~40-method adapter, zero prior art, single-owner, forever** | None |
| Failure mode if it goes wrong | **"admin doesn't boot"** (bet-the-platform) | Incremental, recoverable |
| Cost / timeline | Multi-quarter, ~183-importer rewrite + full CMS adapter | Fraction of it; no platform bet |

**When the Convex full-replace would actually win:** only if (a) live multi-user collaboration / real-time reactivity becomes a **committed product requirement** across surfaces that can actually consume it (i.e., a client-island admin experience, not the SEO storefront), **and** (b) the team accepts owning a bespoke Payload adapter as a standing cost, **and** (c) hosted-Convex lock-in is a deliberate strategic choice. None of those hold today.

**When unify-on-Mongo wins (today's reality):** the goal is "never two databases in sync" + simplicity + low risk. The single-ORM consolidation delivers exactly the user's stated constraint — collapse `shops`/`tenants` to one canonical record, delete `attachShopSync`, make reviews hold an id reference on both sides — with no proprietary lock-in and no platform bet. **It strictly dominates the Convex path on the very axis the user cares about.** Convex is not *infeasible*; it is *unjustified*, because the cheaper option already gets the user what they asked for.

---

## 1. Updated TL;DR Verdict

**Verdict: still don't migrate — but the reason changed. Prototype the adapter spike first ONLY to confirm the kill, do not greenlight the rewrite.** Concretely: **conditional-no, leaning hard no.**

The user's "never two databases" constraint is *legitimate and currently violated* — but a Convex Payload adapter does **not** satisfy it, and pursuing it makes things worse before it makes them better. Three corrected facts drive this:

1. **A Payload→Convex adapter is a quarters-to-infeasible build, not a feature swap.** The one-line `db:` change at `packages/cms/src/config/index.ts:221` is real and irrelevant. Behind it sits ~40 contract methods, and three of them — **interactive multi-statement transactions, runtime-arbitrary `where`/sort over a static index-only engine, and the migration CLI** — have no faithful Convex mapping. The transaction gap is structural: Payload opens a transaction in its Node process, threads it through several awaited adapter calls (e.g. `updateOne` + `createVersion`) with user hooks doing external IO in between, then commits. A Convex mutation is a single self-contained IO-free function reached over HTTP; you physically cannot hold one open across those round-trips. Payload *tolerates* `beginTransaction()` returning `null` (non-transactional mode, how it runs against standalone Mongo), so the adapter is technically **buildable in a degraded mode** — but that permanently surrenders cross-document atomicity for every doc+version+relationship write. (See §2.)

2. **Even a perfect adapter does NOT eliminate the second database.** The adapter only replaces the CMS Mongo at one `db:` line. The storefront's *primary* data — `shops`, `reviews`, `users`, `sessions`, `identity`, `feature-flags` — lives in `packages/db`, an independent Mongoose layer with ~176 importers that **never goes through Payload** (raw `.find`/`.aggregate`, plus `findByDomain` on the edge-middleware hot path). The adapter does nothing for it. Ship the adapter alone and you have Convex (CMS) **+** Mongo (`packages/db`) = still two databases. Truly killing sync is **two projects**: the adapter *and* a full rewrite of `packages/db` onto the same Convex deployment. (See §4.)

3. **The "sync" the user hates is not caused by having two databases — it's caused by two ORMs modeling the same entities differently.** Today the platform already runs on **one physical Mongo** yet still carries a `Shop`→`tenant` post-save sync hook (`packages/cms/src/shop-sync/post-save-hook.ts`) and divergent denormalized shapes (reviews embed a full Shop snapshot in Mongoose but store a `shop` relationship id in Payload). One database did not prevent sync; **one canonical schema** does. Convex is neither necessary nor sufficient for that — the unification work (collapsing `shops`/`tenants`, retiring the hook, making storefront read-models indexed views over the canonical tables) is the actual deliverable, and most of it is achievable on Mongo today. (See §4.)

**Resolving the user's constraint directly:** the way to honor "never two databases in sync" is **schema unification + a single access layer**, not a datastore swap. The minimum that genuinely removes sync is: one canonical `shops`/`tenants` table, one access path, storefront reads as views rather than copies. That is doable on the *current* Mongo and is a prerequisite either way. Convex on top buys reactivity the server-first architecture mostly can't consume (see §6–§7) at the cost of a quarters-long adapter forgery plus a 176-importer rewrite. **The constraint is best satisfied by fixing the schema, not by adopting Convex.**

What changed vs. Revision 1: BLOCKER#2 (no RLS) is **downgraded** — Convex *does* have an RLS mechanism and multi-tenancy is the easy part (§3). BLOCKER#1 (dual-DB) is **reframed, not dissolved** — the adapter relocates the dual-DB problem into a fragile adapter and a second migration rather than removing it (§2, §4).

---

## 2. Convex Payload Adapter Feasibility (NEW)

**Corrected effort: quarters → infeasible as a *faithful* production adapter; weeks-to-months as a *degraded, non-transactional, small-table-only* adapter that would not survive this app's admin and version load.**

### The contract (Payload 3.85 `BaseDatabaseAdapter`, via `createDatabaseAdapter`)

~40 methods. Grouped by Convex-mappability:

**Maps cleanly to Convex primitives:**
- `create` → `ctx.db.insert`; `findOne`/`find` by id → `ctx.db.get`; `deleteOne` by id → `ctx.db.delete`; `updateOne` by id → `ctx.db.patch`/`replace`. Each is naturally atomic *because* it is one mutation.
- Equality/range `where` operators (`equals`, `not_equals`, `greater_than[_equal]`, `less_than[_equal]`, `in`, `exists`) → `withIndex()` range bounds + `.filter()` predicates — **only when a matching index is pre-declared**.
- Single-indexed-field sort + cursor pagination → `withIndex().order().paginate()`.
- `findGlobal`/`createGlobal`/`updateGlobal` → single-row tables.
- `connect`/`init`/`destroy` → near no-ops (Convex is a stateless HTTP/function client; nothing to pool).
- `generateSchema` → emit `defineSchema`/`defineTable` from collection configs (one-time codegen; good fit).

**Structural gaps (not polish — these are why the verdict is impractical):**

1. **Interactive multi-statement transactions — the fatal gap.** `beginTransaction()` returns a handle reused across many later awaited calls, then `commit`/`rollback`. No Convex equivalent: a mutation is one self-contained invocation, cannot do external IO, cannot be held open across host-side awaits. Two escape hatches, both broken here: (a) buffer all ops host-side and replay inside ONE generated mutation at commit — breaks read-after-write *within* the txn, and can blow the 8 MiB/16k-scan and 1 MiB-arg limits; (b) return `null` and run non-transactional — sanctioned by Payload, but **permanently loses atomicity** for create+version+relationship cascades. Hooks make (a) impossible anyway: this repo's `beforeChange`/`afterChange` do real external IO (`attachShopSync`, `@payloadcms/storage-s3` uploads, `@payloadcms/email-resend`), which a Convex mutation forbids. So **non-transactional is the only option** — a correctness regression, not a config choice.

2. **Runtime-arbitrary `where`/sort over a static, index-only engine.** Payload generates filter/sort trees over admin-configurable fields *at runtime*. Convex indexes are declared in `schema.ts` and shipped via `convex deploy` (max 32/table, 16 fields/index) — there is **no runtime `CREATE INDEX`**. Any filtered/sorted field lacking a pre-declared index degrades to `.filter()` = a bounded full table scan (~16k docs / 8 MiB). Whole operator classes are *unrepresentable*: `like`/`contains`/regex substring search (no Convex operator; only prefix via a separate search index), arbitrary-field `in`/`not_in` (expands to or-chains or N queries), geospatial `near`/`within`/`intersects` (none — though dead weight here; no collection uses geo). **Admin list views break concretely:** they need `totalDocs`/`totalPages` (offset pagination) on every table; Convex has no O(1) count and only opaque-cursor pagination, so rendering a large `products`/`orders` admin list scans to the 16k ceiling just to paginate.

3. **Static-schema-vs-dynamic-collections deploy coupling.** Every Payload config/field edit that adds a filterable/sortable field now requires regenerating `schema.ts` + `convex deploy` (codegen, schema validation that can *reject existing rows*) in lockstep with the app. This contradicts Payload's edit-config-and-restart DX (the storefront even builds config with `includeAdmin:false` per deployment). The two goals are mutually exclusive: store docs as schemaless/opaque JSON to avoid redeploys → you lose index declaration AND validation → scans everywhere; declare schema for indexed scan-safe queries → redeploy on every config change. **You cannot have both.**

4. **Versions/drafts/localization + autosave write-amplification.** Every versioned collection here (`pages`, `articles`, `product-metadata`, `collection-metadata`, `header`, `footer`, `businessData`) runs `versions.drafts.autosave.interval = 2000`. That is a `createVersion` write every 2s per open editor. Convex mutations run under OCC and **retry/abort on write conflict**; a steady 0.5 Hz autosave stream against the same parent's version index is exactly the contention pattern Convex throttles — Mongoose has none of this. `queryDrafts` ("latest version per parent") needs server-side aggregation Convex has no native primitive for → scan-limited or app-side compute. Localization compounds the 1 MiB doc cap: Payload stores **all locales of a localized field inside one document**; a localized Lexical richtext body × dozens of BCP-47 locales serializes N times into one Convex doc and can exceed 1 MiB (Mongo tolerates 16 MiB) — a hard write failure requiring field-splitting.

5. **Migration CLI + IDs + reach.** `createMigration`/`migrate`/`migrateDown`/`migrateFresh`/`migrateRefresh`/`migrateReset`/`migrateStatus` assume imperative up/down scripts; Convex owns schema evolution via push with no down-migrations — stub-able but you lose Payload's tooling. Convex `_id` is a per-table branded opaque string, not Payload's free-form `'text'|'number'` id; relationship/polymorphic/`tenant` fields reference Payload's *own* id, so you must store it as an indexed `by_payloadId` field on every table and reimplement relationship resolution as extra lookups. And the killer reach problem: **`ctx.db` only exists inside a deployed Convex function.** The adapter runs in an external Node process and can only reach Convex over RPC to *pre-deployed* generic CRUD functions — so the runtime where-AST→Convex-query compiler must itself be deployed Convex code that, receiving filters at runtime, cannot statically pick indexes and falls back to scans. Relationship population (`depth`) becomes N+1 `ctx.db.get` over HTTP on read paths Mongoose resolves in-process.

### Verdict on (a)

A Convex adapter is the seductive one-line swap the original spec warned about. It is **buildable only in a permanently degraded mode** (no atomicity, scan-capped queries, deploy-coupled schema, OCC autosave contention, 1 MiB localized-doc failures), and **even when built it does not eliminate the second database** — it replaces CMS-Mongo while `packages/db`-Mongo remains. Effort to a faithful adapter: **infeasible**. Effort to a fragile degraded adapter that boots admin: **quarters**, and it would not hold up under this app's version/autosave/admin-list load. **Do not build it.**

---

## 3. Single-Database Multi-Tenancy Plan (NEW — resolves old BLOCKER#2)

**The original "Convex has no RLS" blocker was wrong. Downgrade BLOCKER#2 to a solved, weeks-scale design problem.** Convex ships `convex-helpers/server/rowLevelSecurity` (`wrapDatabaseReader`/`wrapDatabaseWriter`) composable with `customQuery`/`customMutation`/`customCtx`, with `RLSConfig.defaultPolicy: "deny"` — fail-closed per-document tenant scoping over `db.get/query/insert/patch/replace/delete`.

### Easiest robust design — three independent, layered guards

1. **Mandatory `tenantId` arg.** Every public function declares `args: { tenantId: v.id('tenants'), ... }`. The validator rejects calls missing it at the boundary.
2. **`tenantQuery`/`tenantMutation` wrappers** (one shared module, built with `customQuery(query, customCtx(...))`). `customCtx` resolves+pins `tenantId` once and swaps `ctx.db` for `wrapDatabaseWriter(ctx, ctx.db, tenantRules(tenantId), { defaultPolicy: 'deny' })`. Every app-facing function MUST use these; raw `query`/`mutation` is forbidden in app modules (enforced by a small Biome/lint rule or a codegen barrel that doesn't re-export the raw primitives; cron/migration/`resolveTenant` use a named `systemQuery` escape hatch).
3. **Tenant-prefixed compound indexes** — `pages.index('by_tenant_handle', ['tenantId','handle','locale'])`, `products.index('by_tenant_handle', ['tenantId','shopifyHandle'])`, etc. Every query starts `.withIndex('by_tenant_…', q => q.eq('tenantId', ctx.tenantId)…)` so isolation is **physically range-bounded**, not just predicate-filtered.

This makes isolation *structural* — a single forgotten scope can't leak because the wrapped `db` denies by default and the index prefix bounds the scan.

### How `findByDomain` stays fast

Maps 1:1 to today's Mongo `findOne`: `tenants.withIndex('by_domain', q => q.eq('domain', host)).unique()`, reactive and cacheable. **Caveat (carried from the original hot-path blocker):** from edge middleware this is a remote `ConvexHttpClient` round-trip, not a process-cached in-region read, and edge can't use reactive subscriptions — so it's a latency/cost regression at that layer regardless of how clean the query is. `alternativeDomains` (today an `$or` over an array) needs a normalized one-row-per-`(domain → tenant)` table indexed `by_domain`, because Convex indexes are scalar-prefix only.

### Interplay with `@payloadcms/plugin-multi-tenant`

Critical limitation: **the plugin enforces isolation in Payload's host-side access-control layer, ABOVE the adapter** — it compiles the tenant constraint into a `where` clause. So the convex-helpers RLS above protects **only functions routed through `tenantQuery`/`tenantMutation`** (the storefront-facing Convex layer). **Payload admin gets zero protection from it unless Payload itself runs on the Convex adapter** (the hard §2 part). In a single-Convex world you'd derive `tenantId` in the same wrapper from the Payload session/cookie (`payload-tenant` + `getTenantFromCookie`) instead of an arg, so admin and storefront share one isolation core. **Trust boundary:** public storefront reads supply `tenantId` as a spoofable client arg — acceptable for per-tenant-public content (RLS still blocks cross-tenant bleed within a call), but mutations and sensitive reads must derive `tenantId` from server-trusted context (Convex auth identity or a server-only re-resolve of hostname→tenant), never the raw arg.

**Net on (b): multi-tenancy is the easy part — weeks, with the discipline burden on lint/codegen enforcement, not infra.**

---

## 4. Does Single-DB Actually Eliminate Sync? (NEW — the core question)

**No — not by itself. One database has never been the thing preventing sync here; one canonical schema is.** Proof from the current codebase, which already runs on a single physical Mongo yet still syncs:

- **Two access layers over one Mongo.** CMS content (`pages`/`articles`/`header`/`footer`/`businessData`/metadata/media) is read by the storefront through Payload's Local API (`get-payload-instance.ts`, `includeAdmin:false`). Everything else (`shop`/`review`/`user`/`session`/`identity`/`feature-flag`) is read through the **separate** `packages/db` Mongoose layer (~176 importers, raw `.find`/`.aggregate`, `findByDomain` on the edge hot path). Same `MONGODB_URI`, two ORMs.
- **`shop`/`review`/`user` exist in BOTH schemas as DIFFERENT documents.** (1) Shop's source of truth is the Mongoose `shops` collection; Payload holds a **derived `tenants` mirror** kept current by `packages/cms/src/shop-sync/post-save-hook.ts` (`attachShopSync` listens on `Shop.model` `post('save')` and upserts a `tenants` row keyed `tenant.slug = shop.id`). (2) Reviews are denormalized divergently: the Mongoose `ReviewSchema` **embeds a full Shop snapshot** (`packages/db/src/models/review.ts`), while Payload's `reviews` collection stores `shop` as a **relationship id** + injected tenant. These are not shared documents — they are separately-shaped copies.

So "make Convex the single DB" does **not** retire the sync hook or the divergent shapes. The hook and the divergence are products of *two ORMs with two schemas*, and they'd reappear on Convex exactly as they exist on Mongo unless you unify.

### What actually removes sync (datastore-agnostic)

1. **Collapse `shops` and `tenants` into ONE canonical table.** One row is simultaneously the storefront shop record and the Payload tenant. The `attachShopSync` post-save hook and its slug-collision bug class disappear.
2. **Make storefront read-models VIEWS, not copies.** `findByDomain` and reviews become indexed queries over the canonical tables, not separately-shaped denormalized documents. Reviews stop embedding a Shop snapshot and resolve the relationship instead.
3. **One access path.** Either Payload owns the canonical tables and `packages/db` reads through it, or `packages/db` owns them and Payload reads through a thin adapter — but not two independent ORMs writing overlapping entities.

**The crucial finding for the user:** items 1–3 are **mostly achievable on the current Mongo today** and are a prerequisite *either way*. A Convex adapter alone (§2) leaves `packages/db` on Mongo → still two databases → still sync. To genuinely reach one source of truth on Convex you need **both** the (infeasible/degraded) adapter **and** a full `packages/db`→Convex rewrite of all 176 importers — two large projects, the second never mentioned in the original optimism. **Schema unification is the deliverable; the datastore choice is secondary and Convex makes it harder, not easier.**

---

## 5. Revised Blockers & What to Prototype First (NEW)

### Revised blockers (corrected severity)

| # | Blocker | Rev-1 severity | Rev-2 corrected | Why |
|---|---|---|---|---|
| 1 | Payload↔Mongo coupling / dual-DB | BLOCKER | **BLOCKER (reframed)** | Adapter relocates rather than removes it; `packages/db` stays on Mongo regardless, so the adapter alone does NOT achieve single-DB. |
| 2 | Multi-tenant isolation / "no RLS" | BLOCKER-class | **MEDIUM (downgraded)** | Convex *has* RLS (`convex-helpers` `wrapDatabaseReader/Writer`, `defaultPolicy:'deny'`). Solvable in weeks with wrapper + tenant-prefixed indexes + lint enforcement. |
| 3 | Interactive transactions | (under #1) | **BLOCKER (new, explicit)** | No Convex primitive is both transactional and external-IO-capable; hooks do external IO, so only non-transactional mode works → permanent loss of cross-doc atomicity. |
| 4 | Static schema ↔ dynamic Payload config | HIGH | **HIGH** | Every filterable-field config edit → `convex deploy` + codegen + revalidation; schemaless-to-avoid-it forfeits indexes → scans. Mutually exclusive goals. |
| 5 | Scan ceilings vs admin list views + `queryDrafts` | (under query) | **HIGH** | 16k/8 MiB cap breaks `totalDocs`/offset pagination on large admin tables and "latest-version-per-parent" aggregation. |
| 6 | Autosave (2s) write-amplification under OCC | not modeled | **MEDIUM/HIGH (new)** | 0.5 Hz/editor `createVersion` against one parent's version index = OCC conflict-retry storms; absent on Mongoose. |
| 7 | 1 MiB doc cap vs localized Lexical richtext | MEDIUM | **MEDIUM/HIGH** | All-locales-in-one-doc multiplies a richtext field N times → can exceed 1 MiB → hard write failure. |
| 8 | `packages/db` rewrite (176 importers) to reach true single-DB | not scoped | **BLOCKER-class (new)** | The adapter ignores the storefront's primary data layer entirely; single-source-of-truth requires migrating it too. |
| 9 | Edge `findByDomain` round-trip | HIGH | **HIGH (unchanged)** | Still a billed remote round-trip on the hottest path; reactivity unusable at edge. |

### What to prototype first — the smallest spike that proves/kills it

**Spike: a degraded read-only Convex Payload adapter for ONE versioned, localized collection (`pages`), booting storefront-only (`includeAdmin:false`).** Smallest surface that exercises every fatal seam at once:

1. Implement `connect`/`init`/`find`/`findOne`/`findGlobal`/`queryDrafts`/`findVersions` against deployed generic Convex query functions via `ConvexHttpClient`; stub `beginTransaction → null`.
2. **Kill-criteria to measure on the spike (any failure = stop):**
   - Can `find` with a Payload `where` on a non-indexed/localized field return correct results *without* hitting the 16k/8 MiB scan ceiling? (Tests gap #2, #4, #5.)
   - Does `queryDrafts` (latest-version-per-parent) work without app-side full-table aggregation? (Gap #5.)
   - Does a localized page with richtext across the full locale superset stay under 1 MiB? (Gap #7.)
   - Does a Payload config edit adding a filterable field require a `convex deploy` to keep queries off scans? (Gap #4 — confirms deploy coupling.)
3. **Then, before any write path:** prototype `findByDomain` from edge middleware via `ConvexHttpClient` under multi-tenant load — p50/p99 vs current process-cached Mongo, plus per-request function-call billing (carried from §9 open question #1).

If the read spike can't satisfy the scan/draft/doc-size criteria — and the analysis says it cannot for large or localized collections — the write path (transactions, autosave OCC) is strictly worse and the approach is dead. **Spend days on the read spike to avoid quarters on the adapter.** In parallel and independent of Convex, prototype the **schema unification** (§4: collapse `shops`/`tenants`, retire `attachShopSync`, reviews-as-relationship) on the current Mongo — that is the change that actually satisfies the user's "never two databases in sync" constraint and is needed regardless of datastore.

---

> **The sections below are the ORIGINAL Revision-1 analysis, preserved unchanged.** They cover the reactivity / RSC-PPR / cost / lock-in dimensions that the new adapter question doesn't alter. Read §1–§5 first; where they conflict, §1–§5 win.

## 6. (orig. §1) TL;DR Verdict — Revision 1

**Don't migrate (not-yet, at most a scoped prototype).** Across all three investigated dimensions the adversarial reviews corrected the original optimism *downward*, and the one dimension carrying real weight — migration mechanics/ops — was upgraded from "high" to **blocker**. The decisive facts are concrete to this codebase: (a) Payload CMS hard-couples to MongoDB via `@payloadcms/db-mongodb` with no Convex adapter, forcing **permanent dual-database operation** regardless of how much else moves; (b) the storefront is server-first (RSC + `cacheComponents: true` + PPR + tag revalidation), so Convex's reactive WebSocket value prop **cannot be used server-side** — from RSC you get `fetchQuery`, a non-reactive HTTP round-trip that is strictly worse than the current cached Mongoose loaders; (c) the `findByDomain` tenant-resolution hot path runs in **edge middleware on every request** with no in-process Convex equivalent, turning a process-cached lookup into a billed network round-trip on the system's hottest path; and (d) the flagship "win," Theme Editor live preview, is a same-browser `postMessage` stream of *unsaved* state — routing it through Convex adds cloud latency and a write storm to solve a problem that is sub-millisecond today. The genuine upsides (multi-user collab editing, live flag flips) are **speculative future features**, not current requirements. The cost model also flips from near-zero infra to per-GB-I/O metered billing on a public storefront. Net: full rewrite cost, reactivity the architecture mostly can't consume.

## 7. (orig. §2) Top Benefits (surviving adversarial review)

1. **Serializable + OCC transactions** — a real upgrade *only for code paths that today lack Mongoose sessions*. Corrected: not a "strict/universal upgrade" (Mongo has had multi-doc ACID since 4.0; OCC thrashes under hot-doc contention; per-mutation atomicity breaks across looped `ctx.runMutation`).
2. **Convex `usePreloadedQuery` provides a managed SSR-snapshot-then-live-WebSocket channel** — genuinely useful *if and when* multi-user/multi-device Theme Editor collaboration becomes a real goal, replacing bespoke origin-checked postMessage + load/ready handshake. Today's spec explicitly scopes single-editor same-browser, so this is latent, not realized.
3. **Explicit `{ token }` per-call API aligns with the "tenant context never implicit" convention** — matches how the repo threads `{ shop, locale }` through `ShopifyApolloApiClient`. A fit, not a payoff.
4. **Preservable in-process dev loop + exit hatch** — `npx convex dev` + open-source self-hostable backend + `convex export` snapshots bound hosting lock-in. Corrected: `convex-test` is a JS mock (not the Rust engine; won't enforce 1 MiB doc / 16k-doc / 8 MiB scan limits), and app code stays coupled to the proprietary function/query API, so a future exit is still a full rewrite.

*Demoted to non-benefits by review:* "eliminates manual-invalidation plumbing" (reactive subscriptions don't regenerate cached SSR/PPR HTML — the revalidate route survives); "instant live flag flips" (flags are baked into per-request SSR/PPR off the cached shop record — pushing to a client diverges from cached HTML); "Convex handles reconnection/fan-out we'd otherwise build" (the platform doesn't need that channel — inventing a problem to justify a solution); "removes gql.tada/projection plumbing" (Shopify/CMS data isn't moving; gql.tada stays).

## 8. (orig. §3) Top Challenges & Blockers (corrected severity)

> **Superseded in part by §2–§3:** item 2 below (no RLS) is **downgraded to MEDIUM** — Convex does have RLS. Item 1 is **reframed** in §1/§4 — the adapter relocates rather than removes the dual-DB condition.

1. **BLOCKER — Payload CMS ↔ MongoDB hard coupling.** `@payloadcms/db-mongodb 3.85.0`, no Convex adapter. CMS can't move without a full re-platform, so Mongo stays in prod indefinitely: two backup/restore stories, two monitoring stacks, two on-call surfaces, two seed/migration pipelines, and cross-store referential integrity with no transaction spanning both.
2. **~~BLOCKER-class~~ → MEDIUM (see §3) — Multi-tenant isolation.** ~~No RLS in Convex.~~ Corrected: Convex *has* RLS via `convex-helpers` `wrapDatabaseReader/Writer` with `defaultPolicy:'deny'`; enforce via shared `tenantQuery`/`tenantMutation` wrappers + tenant-prefixed indexes + a lint/codegen gate. Solvable in weeks.
3. **HIGH — RSC/PPR architecture mismatch.** `preloadQuery` forces `cache: 'no-store'`, opting Server Components out of static rendering — direct collision with `cacheComponents: true`, `'use cache'` boundaries, and `cacheTag` revalidation in `_loaders.ts`. Concrete failure mode (named by review): any data made client-reactive **cannot be in the prerendered SEO payload** → hydration divergence / SEO loss on exactly the public surfaces where real-time would be visitor-facing. Middle road exists (plain `useQuery` in a client island under a static PPR page) but trades the SSR snapshot for a loading flash.
4. **HIGH — `findByDomain` edge-middleware hot path.** Invoked in `apps/storefront/src/middleware/storefront.ts` on effectively every request, process-cached against in-process/local Mongo. Convex has no first-class low-latency edge client; every hostname resolution becomes a billed remote round-trip on the critical path. Latency **and** metered-cost regression.
5. **HIGH — Metered billing on a public storefront.** Convex bills per function call + bandwidth; a reactive query reruns server-side on every underlying write. At visitor scale across many tenants this is a potentially order-of-magnitude cost line over flat Mongo, with connection/concurrency ceilings. Build-time fan-out (`generateStaticParams`/sitemaps, N tenants × M params) bursts against function-call quotas.
6. **MEDIUM/HIGH — Cutover risk.** ETL only (`mongoexport → JSONL → remap ObjectId/refs → convex import`); no native Mongo importer, no dual-write/dual-read plan described → implies a write-freeze window with no rollback/reconciliation on a live multi-tenant system.
7. **MEDIUM — Rewrite breadth + lost projection control.** ~50 files touch mongoose, 176 import `@nordcom/commerce-db`. Convex returns whole documents — the wire-size projection optimization (notably `findByDomain`) must be re-expressed via narrower tables/denormalization. Query ceiling (16k docs / 8 MiB scan) blocks any future cross-collection join/aggregation/full scan (mitigated today: no `.aggregate()` in `packages/db/src`).
8. **MEDIUM — Testing fidelity gap.** `convex-test` won't catch doc-size/scan/index limits that fail in prod; the hermetic `@nordcom/commerce-test-mongo` (real `mongod`) e2e/dev harness must be rebuilt around a separate `convex dev` subprocess.

## 9. (orig. §4) Per-Dimension Table

| Dimension | Corrected Severity | Key Benefit | Key Risk |
|---|---|---|---|
| Real-time / reactivity upside | **low** (was medium) | Latent multi-user Theme Editor collab + managed channel — *if* it becomes a goal | Almost no polling/live-sync to delete; reactivity can't update cached SSR/PPR HTML and breaks SEO on public surfaces; per-visitor WebSocket fan-out is metered |
| Next.js 16 App Router + RSC integration | **medium** | `usePreloadedQuery` server-snapshot→live channel; explicit `{token}` matches conventions | `preloadQuery` `no-store` collides with `cacheComponents`/PPR; reactivity confined to `use client` islands; **middleware `findByDomain` becomes a remote round-trip** |
| Migration mechanics, ops, testing, cost, lock-in | **blocker** (was high) | Serializable/OCC transactions (where sessions absent); preservable dev loop + self-host exit hatch | **Payload↔Mongo forces permanent dual-DB**; ETL-only cutover with write-freeze; metered prod billing (note: "no RLS" corrected in §3) |

## 10. (orig. §5/§6) Migration Strategy & Open Questions (if pursued anyway)

- **Incremental only — big-bang is off the table.** Payload-on-Mongo guarantees Mongo remains in prod, so any plan is inherently dual-database. Treat Convex as an *additive* system for new reactive features, not a replacement for the data layer.
- **Move first — the centralized service layer is the seam, but pick the right service.** Start with the **lowest-risk, lowest-traffic, non-SEO, write-light** service: `session` (a thin generic Mongo service) or `identity/user`. **Explicitly do NOT start with `shop`/`findByDomain`** — it is the edge-middleware hot path and would regress latency/cost immediately. Each migrated query must re-encode tenant scoping by hand (no RLS) and re-express projection via narrow tables/indexes.
- **Realtime quick-win — scope it as a standalone channel, not a DB migration.** If live multi-user/multi-device Theme Editor preview is genuinely desired, add Convex (or plain SSE/WebSocket) for *that one channel only*, writing a draft-theme doc subscribed via `useQuery` in the editor + preview islands. Caveat the team accepted: this is **strictly worse than `postMessage` for the single-editor same-browser case** (cloud round-trip + write-per-slider-tick + OCC retries), and parity (byte-identical preview == published render) stays owned by the isomorphic `serializeThemeToCssVars`, not the transport. Only justified once collaboration is a committed requirement.
- **Do NOT move:** Payload CMS (no adapter — re-platform only); Shopify-owned cart (system of record is Shopify); SSR/SEO-cached read surfaces — reviews, server-evaluated feature flags (Vercel Flags adapter off the cached shop record), storefront product/CMS loaders (tag-revalidated, static); and `findByDomain` middleware resolution. Mirroring any of these into Convex creates a dual-write second-source-of-truth bug class where "live-ness" is just mirror-sync lag.

**Open questions (still to prototype before committing):** (1) edge-middleware latency budget for `findByDomain` via Convex vs process-cached Mongo + per-request billing; (2) PPR/SEO coexistence of a Convex-reactive island under a static route; (3) structural multi-tenant isolation harness (now answered in §3 — wrapper + indexes + lint); (4) cost model on real multi-tenant traffic incl. build-time fan-out; (5) dual-DB referential integrity with no spanning transaction; (6) per-service dual-write/dual-read cutover bridge to avoid a write-freeze; (7) Theme Editor collaboration demand signal; (8) `convex-test` + `convex dev` fidelity vs the real-`mongod` harness.
