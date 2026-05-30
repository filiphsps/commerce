# CMS Fork Decision — Payload-on-Convex vs. Rebuild vs. Adopt

Companion to [`spec.md`](./spec.md), [`plan.md`](./plan.md), and [`mongo-teardown-inventory.md`](./mongo-teardown-inventory.md).

**The question.** The migration is committed to a single Convex source of truth with zero Mongo. Payload's CMS persists through `@payloadcms/db-mongodb` (`mongooseAdapter`, `packages/cms/src/config/index.ts:221`) — there is **no official Payload Convex adapter**. So the CMS half forces a fork decision the storefront/`packages/db` half does not. This document maps what Payload gives us today, scores three options against it, records the judge-panel verdict, recommends one, and states exactly how the migration spec/plan change under the recommendation.

**The headline.** The current spec/plan are built on **Option A** (build a bespoke Convex `BaseDatabaseAdapter` — §1.2, Track B, Phase 1 "Adapter kill-criteria spike"). The judge panel votes **3–0 for Option B** (drop Payload, rebuild CMS authoring on Convex). **That kills the adapter track.**

---

## 1. Payload usage map — what must NOT regress

The premise "we already have most of a CMS" is **false at the engine level**. The `editor/` subsystem (4,332 LOC) and the 90 custom UI components are a thin manifest/routing/access **veneer over Payload's Local API + `@payloadcms/ui`**. 92 files import `payload`/`@payloadcms`. Convex provides a reactive document DB + functions + file storage + cron + TS codegen — and **zero CMS primitives**. Everything below is Payload's today.

### 1.1 Content model (13 collections)
`tenants`, `users` (dbName `payload-users`), `media`, `shops` (3rd shop rep), `feature-flags`, `pages`, `articles`, `productMetadata`, `collectionMetadata`, `reviews`, and 3 tenant-singletons `header`/`footer`/`businessData` (`isGlobal:true`). 9 collections get an injected `tenant` field via `plugin-multi-tenant`. Single-source-of-truth `BLOCK_TYPES` (9 blocks: columns/alert/banner/collection/html/media-grid/overview/rich-text/vendors) drives pages + product/collection metadata. Reusable field builders: `seoGroup`, `imageField`, `linkField` (typed `LinkRef`: kind + page/article/product/collectionRef/url), recursive `navItemField` (depth 6).

### 1.2 Engine capabilities relied on (all Payload, none in Convex)
- **`mongooseAdapter`** — the Mongo seam; Payload `users` routed to `payload-users` to avoid colliding with the NextAuth/Mongoose `users` collection.
- **Multi-tenant** (`plugin-multi-tenant`): injected `tenant` field, 3 tenant-singletons, `payload-tenant` cookie, `getTenantFromCookie` per-request locale narrowing, `userHasAccessToAllTenants=admin`.
- **Drafts + 2s autosave + version history + restore**, `_status` published/draft; `draft:true` **deliberately skips required-field validation** so partial autosaves don't throw; `payload.restoreVersion`.
- **Localization**: ISO-639-1 (184) + BCP-47 region-tagged superset, `defaultLocale en-US`, `fallback:true` (request→shop→platform), `filterAvailableLocales` per-tenant narrowing, ~35 localized fields.
- **Lexical richtext** (`@payloadcms/richtext-lexical`) at `articles.body`, `productMetadata`/`collectionMetadata.descriptionOverride`, the rich-text block.
- **Access control**: 13 access fns (`tenantScopedRead/Write`, `adminOnly`, `publishedOrAuthRead`, `isTenantMember`, `isAdmin`), field-level role gating (`users.role`), shops **secret-field write-reject + read-strip** (`commerceProvider.authentication.token`, `customers.clientSecret`) with `req.context.sensitiveShopRead` server-only opt-out, `overrideAccess` enforce-in-editor / bypass-in-sync semantics.
- **Media**: S3/R2 (`@payloadcms/storage-s3`), `sharp` resize, 4 named imageSizes (thumbnail/card/feature/hero), focalPoint, image/video-mp4/pdf mime allowlist, CDN URL generation.
- **Live preview**: tenant+locale preview URL, draft mode, origin-verified theme `postMessage` bridge (`theme-preview-ready` handshake).
- **Payload UI form pipeline**: `buildFormState`/`FormState`/`<Form>`/`<ServerFunctionsProvider>`, `RenderFields`, `RootProvider`, `useField`/`useForm`/`dispatchFields`; even the "custom" theme editor binds every control to Payload form state.
- **Codegen**: `payload generate:types` → `payload-types.ts` (committed, `cms:gen:check` CI gate); per-collection `'use server'` action codegen (`cms:gen`).
- **Cache/revalidation**: `@tagtree` `cmsCache` per-tenant tag fanout, `buildRevalidateHooks` afterChange/afterDelete → `revalidateTag`, `cmsTenantRootTags`.
- **Shop→tenant sync**: Mongoose `schema.post('save')` upserting the `tenants` row (WeakSet-idempotent).
- **Mounted REST + GraphQL** endpoints (force-dynamic); transactional email (`@payloadcms/email-resend`).
- **Custom `editor/` subsystem**: 13 `CollectionEditorManifest`s, `createCollectionEditorActions` (7 server actions: saveDraft/publish/create/delete/bulkDelete/bulkPublish/restoreVersion), `EditorRuntime` DI bundle, editor UI primitives (List/Edit/New/Versions pages), tenant kinds, `revalidateForManifest`.

### 1.3 Storefront contract (must stay byte-identical)
11 read getters (`getPage`/`getPages`/`getArticle`/`getArticles`/`getHeader`/`getFooter`/`getBusinessData`/`getProductMetadata`/`getCollectionMetadata`/`resolveLink`/`resolveTenantId`) over `payload-types.ts` shapes (Media/Article/Header/Footer/BusinessDatum/Page.blocks/Product+CollectionMetadatum), depth-2 populate, **null-on-missing** (null must not 404 the host page). The storefront runs its **own in-process Payload singleton** (`get-payload-instance.ts`, `includeAdmin:false`) for reads — **no network**. 38 call sites across 33 files; its **own** block dispatcher (not the CMS `BlockRenderer`); locale-map normalization (`_normalize-payload.ts`).

### 1.4 What genuinely carries over to a rebuild (Option B reuse)
The admin **shell chrome** (~30 Payload-agnostic nav/command-palette/shop-switcher/skeleton/header-footer components), NextAuth, the access **predicates** (pure functions), route/list manifest metadata, the leaf theme-control widgets, and the db-package registries (`BLOCK_TYPES`, `LinkRef` shape, theme catalog / `deriveCatalog`) which already have **no React/Payload imports**.

---

## 2. Options vs. mapped requirements

`native` = works out of the box · `workable` = preserved with moderate glue · `rebuild` = build from scratch · `gap`/`rebuild(showstopper)` = no faithful mapping.

| Requirement (from §1) | A — Payload + bespoke Convex adapter | B — Drop Payload, rebuild on Convex | C — Adopt alt CMS (Keystatic/Tina/Sanity/…) |
|---|---|---|---|
| **Multi-tenant** (3 shop reps + `resolveTenantId` + tenant-singletons + sync) | workable | workable | rebuild |
| **Localization** (ISO+BCP-47 superset, per-tenant narrowing, fallback chain, locale-map) | workable | rebuild | gap |
| **Versions/drafts/2s-autosave/restore** (draft-skips-validation, no-keystroke-clobber) | **gap** (queryDrafts/findVersions blow read limits) | rebuild | gap |
| **Lexical richtext** (same JSON the storefront renderers parse) | native (opaque blob round-trip) | gap | rebuild (Portable Text / Markdoc / ProseMirror — not Lexical) |
| **Live preview** (theme postMessage bridge + draft reads) | native (app-layer) | workable | gap |
| **Access control** (13 fns + secret strip/reject + overrideAccess) | workable | rebuild | rebuild |
| **38 storefront read sites** (getter sigs + payload-types shapes + null-on-missing) | native | rebuild | rebuild |
| **90 custom UI + editor/ subsystem + 7 server actions** | native | rebuild (engine), reuse shell | rebuild |
| **Generic schema-driven FORM/FIELD-RENDER engine** (12+ field types, depth-6 nav, blocks, conditional, localized, autosave) | native | **rebuild (the long pole)** | rebuild |
| **Media** (4 sizes + focal + S3/R2 CDN + mime allowlist) | native | gap | gap |
| **Zero-Mongo clean** | **NO** (`packages/db` mongoose.connect is independent of Payload; adapter doesn't touch it) | **YES** (by construction) | NO (trades Mongo for a new external store) |
| **Kills the adapter track** | NO (it IS the adapter) | YES | YES |
| **Multi-op transactions** (beginTransaction handle across awaited ops) | **rebuild (showstopper)** — Convex txn is atomic to one mutation; `ConvexHttpClient` can't hold a session open | N/A | N/A |
| **Dynamic Where-AST queries** (vs Convex predefined-function-only client) | **gap** — generic AST interpreter under ~16k-doc/8MiB per-call limits | N/A | N/A |
| **Effort band** | multi-quarter (single make-or-break spike) | multi-quarter (CMS rebuild) | multi-quarter + disqualified |

**Two confirmed Option-A showstoppers** (not "hard parts"): (1) Payload opens a transaction handle and threads multiple awaited ops by `req.transactionID` across round-trips before commit; Convex transactions are atomic to a **single** mutation invocation and `ConvexHttpClient` cannot hold a session open across calls — the adapter's transaction contract has **no Convex equivalent**. (2) Payload feeds the adapter arbitrary nested where-ASTs, but Convex's external client can **only** invoke predefined deployed functions, forbids runtime-built indexes, and warns against `.filter()`; a generic AST interpreter runs under per-call read limits that `queryDrafts`/`findVersions` (latest-version-per-parent + where + sort) will exceed at version-table scale. **And A does not even deliver zero-Mongo**: `packages/db/src/db.ts:61` calls `mongoose.connect(MONGODB_URI)` with its own shop/user/session/review/identity/feature-flag models, entirely independent of Payload — that layer stays on Mongo regardless of how good the adapter is.

**Option C is a closed branch.** Every adoptable CMS trades Mongo for a **new external system of record**: SaaS (Sanity/Builder/Hygraph) → a vendor Content Lake (not Convex, not self-hostable into it); Git-backed (Keystatic/Tina/Outstatic) → a Git repo as the datastore (Git cannot do 2s autosave, concurrent editors, per-tenant version restore, or 38 isolated tenants without absurd commit churn). The only Convex-native options are immature (`basic-blog-convex-blog-cms` = single-site blog, no multi-tenant/localization/versions/access) or mere primitives (`prosemirror-sync` = a rich-text storage component, not a CMS). None keeps content in Convex; adopting a vendor studio also discards the 90 custom admin components.

---

## 3. Judge-panel verdict

Three lenses, each ranking A/B/C and naming a killer risk.

| Lens | 1st | 2nd | 3rd | Confidence |
|---|---|---|---|---|
| **product-velocity** (shipping speed + editor UX) | **B** | A | C | medium |
| **risk-architecture** (single-source-of-truth, zero-Mongo mandate) | **B** | C | A | high |
| **maintenance-cost** (smallest standing on-call liability) | **B** | C | A | high |

**Tally: B = 3 first-place · A = 0 · C = 0. Unanimous for B.**

**Consensus rationale.** Only B satisfies all three things at once: zero-Mongo **by construction** (deleting Payload removes the adapter, and the Convex cutover removes `packages/db`'s independent `mongoose.connect` in the same coherent move), a single source of truth (content lives **in** Convex), and no bespoke-adapter time bomb. A is disqualified on the panel's own terms — it **provably does not reach zero-Mongo** (packages/db is independent of Payload, verified at `db.ts:61`) **and** it is the adapter time bomb (zero prior art, ~40-method surface, a transaction model Convex cannot satisfy, a dynamic-query model the external client cannot serve at scale) that may never boot. C is disqualified on single-source-of-truth (it relocates content to a new external store) and still forces a near-total admin rewrite plus a Lexical→foreign-format migration.

**Dissent / ordering disagreement.** The only split is **2nd place**: product-velocity ranks A above C (the "keep the editor verbatim" path *looks* fastest on paper before its incompatibilities bite), while risk-architecture and maintenance-cost rank C above A (a closed branch is still less dangerous than betting the org on an adapter the docs say is impossible). No lens places A first; no lens places C first. There is **no dissent on the winner**.

**Each lens's killer risk for B (the shared concern).** All three name the **same** long pole: the generic schema-driven form/field-render engine. It must rebuild from scratch what `@payloadcms/ui` provides today — 12+ field widgets (text/textarea/select/checkbox/number/date/email/json/code/relationship/upload/array/group/blocks/collapsible), recursive nav arrays at depth 6, conditional fields, per-field localized buckets, dirty-tracking, validation, and 2s autosave that doesn't clobber in-flight keystrokes — **plus** the subtle correctness behaviors already debugged against Payload (`REPLACE_STATE` keystroke clobber, draft-skips-required-validation, autosave-revalidate-skip, locale fallback). It is **~a quarter on its own**, it is **shared across all 13 collections**, and **nothing migrates cleanly until it reaches parity** — so editor-UX regression risk stays concentrated at the end with no incremental de-risking and no partial-cutover fallback.

**Shared mitigation (named by all three lenses).** Build and prove the form engine + drafts/versions/localization/access on **ONE collection end-to-end first** (spike the two hardest: `header` recursive nav + `pages` blocks) and gate the whole program on it; **freeze the storefront read contract** (the 11 getters + `payload-types` shapes + null-on-missing across 38 call sites) up front so reads can be re-pointed behind unchanged signatures while authoring is rebuilt behind them.

---

## 4. Recommendation

**Adopt Option B — drop Payload entirely and rebuild CMS authoring natively on Convex.**

Rationale:
1. **It is the only option that satisfies the committed mandate.** Zero Mongo + single source of truth are non-negotiable. A cannot reach zero-Mongo (independent `packages/db` layer) and rests on two confirmed architectural showstoppers; C relocates content to a new external store. Only B keeps content in Convex with no second system of record.
2. **It removes the worst class of standing liability** — a bespoke adapter chasing Payload 3.85's fast-churning private DB interface at its single least-compatible seam (transactions + dynamic queries), with a single-owner bus factor and a binary "admin-doesn't-boot" failure mode. B's liability is large but **bounded, self-owned, and built on Convex's stable public API with generated types** — no third-party internal interface to track, no Payload upgrade landmines.
3. **The "we have a CMS" reuse argument doesn't survive the code.** 92 files import Payload; the editor veneer sits on `payload.find/create/update/restoreVersion` + `@payloadcms/ui`. A's preserved-investment advantage is real **only if the adapter works**, and the docs say it cannot. Betting the roadmap on a spike likely to fail risks a quarter sunk, then doing B anyway — the worst velocity outcome.

**This is honestly a CMS rebuild, not a migration.** B explodes CMS scope (a full form engine, drafts/versions, localization, access, lexical, media pipeline) and re-architects the storefront read path (in-process Payload singleton → Convex client reads). The recommendation is adopted **with eyes open** to the form-engine long pole and **conditioned on** the one-collection-first gate + the frozen read contract above. Carry exactly two Convex components into the build as **building blocks, not adoptions**: `prosemirror-sync` for rich-text storage/editing (note: it stores ProseMirror/Tiptap JSON, so the storefront's **Lexical renderers must migrate in lockstep** or a Lexical↔ProseMirror conversion layer is added) and the `convex-authz` pattern as a starting point for tenant-scoped/role access.

---

## 5. Plan impact — exactly how the spec/plan change under Option B

The current spec/plan assume **Option A**. Adopting B is a structural rewrite of the CMS half. **The single most important consequence: the entire bespoke-adapter track is deleted, and the CMS half flips from "storage swap under Payload" to "ground-up CMS rebuild on Convex."**

### 5.1 DELETED (Option-A-only — these go away entirely)
- **Phase 1 — "Adapter kill-criteria spike"** (whole phase): the `convexAdapter`/`createDatabaseAdapter` scaffold, `PAYLOAD_DB=mongo|convex` selection, the `generateSchema` Payload-config→`convex/schema.ts` emitter, the admin-boot tripwire (`payload init` + headless pages create/edit + preferences + doc-lock), the `create→createVersion` "one version row == Payload snapshot" contract test, the concurrent-autosave OCC kill-condition.
- **spec §1.2 "Payload-on-adapter for admin"** entirely; **§3 blockers #2, #3, #4, #5, #6, #7, #8** (all adapter-internal: ~40-method surface, non-txn write model, Where-AST→index compiler, scan ceilings/aggregate pagination, `generateSchema` codegen, 1 MiB localized-Lexical shredding, autosave OCC) — these describe problems that **only exist because Payload feeds an adapter**. Under B there is no adapter; these blockers are not mitigated, they are **moot**.
- **"Track B" (Payload-on-adapter)** as a workstream; `cms:schema:gen`/`cms:schema:gen:check`; the `_i18n` shred tables / `payload-preferences`/`payload-locked-documents`/`payload-migrations`/`payload-jobs` internal-collection schema work (Payload-internal — gone with Payload).
- **Phase 6 step 5 — the "CMS-content dual-read loader on the Payload Local API path"** in its Option-A form (read Payload-on-Mongo **and** Payload-on-Convex-adapter, serve one). There is no Payload-on-Convex to shadow against; see §5.3 for what replaces it.
- **Phase 8 step 5 — "Admin (Payload) cutover: flip `PAYLOAD_DB=convex`… prod admin-boot healthcheck auto-reverts `db:` to `mongooseAdapter`."** No `PAYLOAD_DB` flag, no `mongooseAdapter` fallback — admin runs on the new Convex-native CMS, cut over per-collection.
- The keep-`mongooseAdapter`-flag-selectable lock-in containment for the **CMS** seam (spec §5 / blocker #12) — there is no Payload adapter seam to keep selectable. (The `packages/db` service-seam containment survives.)

### 5.2 SURVIVES UNCHANGED (storefront/`packages/db` half — independent of the CMS option)
- **Phase 0 — schema unification on Mongo (Migration-1)** stays the prerequisite de-risker (collapse 3 shop reps, delete `attachShopSync`, reviews→id-reference). Still ships on Mongo first.
- **Phase 2** (Convex schema + multi-tenant RLS core), **Phase 3** (test-harness swap), **Phase 4** (Convex→Next revalidation bridge — now triggered by **Convex-native CMS** publish mutations rather than Payload afterChange), **Phase 5** (native `packages/db` reads behind the unchanged service seam + prerender audit), **Phase 7** (data pipeline/reconciliation), **Phase 8** Phases A–D for the **storefront services** (dual-write/shadow/flip/stop-Mongo via the outbox).
- The §2 reactivity lanes, the §4 multi-tenancy enforcement, the §5 cost guardrails — all storefront-side, all retained.

### 5.3 ADDED / REPLACED (the new CMS-rebuild track — replaces Track B)
- **New "Track B′ — Convex-native CMS."** Re-express the 13 Payload `CollectionConfig`s + their field metadata as a **new Convex-native field-descriptor source of truth** that drives a hand-built generic renderer. Convex codegen + that descriptor **replace** `payload generate:types`/`payload-types.ts` and `cms:gen`.
- **New Phase 1′ — Form-engine gate (replaces the adapter spike).** Build the generic schema-driven form/field-render engine end-to-end on the two hardest collections (`header` depth-6 nav + `pages` blocks), including drafts/versions/restore, per-field localized buckets + fallback, 2s autosave without keystroke clobber, and the access guards. **Hard gate: this must reach editor parity before any other collection cuts over.** This is the program's long pole and single largest risk.
- **Sequence the rebuild strictly:** (1) freeze the storefront read contract + `payload-types` shapes; (2) stand up the Convex CMS schema + reads and re-point the 38 getters behind **unchanged signatures**; (3) build the shared form engine + drafts/versions/localization/access; (4) cut over admin **per-collection**. **Nothing migrates cleanly until step 3 lands.**
- **Rebuild the media pipeline** (Convex file storage doesn't do sharp resize / 4 named sizes / focal point / R2-CDN URLs / mime allowlist out of the box).
- **Rebuild access enforcement** as Convex function guards (13 fns + field-level secret reject/strip on `commerceProvider` tokens + server-only trusted opt-out + overrideAccess semantics) — flagged as easy to get subtly wrong on secret exposure; gate with explicit secret-exposure tests.
- **Replace Phase 6 step 5** with a CMS-content read-cutover that shadows the **Convex-native CMS reads against the existing Payload-on-Mongo reads** (not Payload-on-Convex), via a dual-read loader on the storefront getter path → divergence ledger → flip, decoupled from admin-write cutover.
- **Re-target the rich-text contract:** if `prosemirror-sync` is used, migrate the storefront **Lexical** renderers (4 richtext fields + the rich-text block) in lockstep or add a conversion layer — a new line item the Option-A plan never had (A round-tripped Lexical as an opaque blob).
- **Decommission/verification checklist (Phase 9):** drop the Payload-adapter items (`PAYLOAD_DB` tripwire, `mongooseAdapter` flag-selectable, internal-Payload-collection `systemQuery` paths); add Convex-native-CMS parity items (form-engine parity on all 13 collections, secret-exposure tests green, media-pipeline parity, rich-text round-trip/conversion verified, the 38 getters serve identical shapes from Convex).

### 5.4 Net effect on the teardown
Under B, every `@payloadcms/db-mongodb` / `mongooseAdapter` / `mongoUrl` / `payload-types.ts` row in [`mongo-teardown-inventory.md`](./mongo-teardown-inventory.md) is satisfied **by deletion** (Payload removed) rather than by an adapter swap — which makes the zero-Mongo Definition-of-Done strictly **easier** to satisfy (no surviving Payload-on-Convex requiring its own Mongo-free proof), at the cost of a far larger CMS application rebuild.
