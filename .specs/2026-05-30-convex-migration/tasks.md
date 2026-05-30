# Mongo → Convex Migration — Work Breakdown (Option B, committed)

Companion to [`spec.md`](./spec.md), [`plan.md`](./plan.md), [`cms-decision.md`](./cms-decision.md), [`mongo-teardown-inventory.md`](./mongo-teardown-inventory.md), and the fan-out [`execution-plan.md`](./execution-plan.md). Machine-readable source: [`tasks.json`](./tasks.json).

**Decision baseline.** FULL Option B: drop Payload entirely, rebuild CMS natively on Convex. **ZERO temporary Mongo — never two authoritative databases at any point in the sequence.** The Option-A adapter track is deleted; spec §1.2 + blockers #2–#8 are MOOT. Phase 0 schema unification ships FIRST and on Mongo. The form-engine parity gate (header depth-6 nav + pages blocks) is the program long pole and a HARD gate.

> This breakdown folds in the DAG scheduler (waves, added deps, dedups), every critic split (`too_big`), every critic `missing_task`, and the critic `ordering_risks`/`weak_acceptance` fixes. Three dedups applied: `TEARDOWN-02`(old, test-consumer migration) → owned by HARNESS-07/08/09; `HARNESS-11` → folded into `TEARDOWN-03`; `BRIDGE-11` → folded into `SFREAD-10`. The freed `TEARDOWN-02` id is reused for **Full Payload application removal** (critic missing #1).
>
> **Revision 1 — graph patch (post-review).** Two kill-gates added to close late-feasibility gaps. **SPIKE-01** — an early throwaway findByDomain edge-latency + Convex cost feasibility spike (wave 2) — gates the first heavy-Convex-investment tasks (`CONVEXCORE-04` / `SFREAD-03` / `CMSDATA-01`), so a fatal latency/cost surprise lands in days, not after the CMS quarter. **CMSRICH-03** — a Lexical→ProseMirror full-corpus round-trip fidelity gate (wave 11) — blocks the CMS content cutovers (`CUTOVER-04/05/06`) until rich-text converts with zero semantic loss. Gates `G-SPIKE` (after wave 2) and `G-RICH` (after wave 11) in [`execution-plan.md`](./execution-plan.md).
>
> **Revision 2 — sizing + auth honesty.** Three monolith tasks the review flagged as under-sized "M" labels were split into right-sized tasks: **media** (`CMSMEDIA-01` storage / **`CMSMEDIA-02`** sharp sizes+focal / **`CMSMEDIA-03`** CDN+storefront), **rich-text** (`CMSRICH-02` storefront renderer / **`CMSRICH-04`** lossless Lexical→ProseMirror conversion codec), and **auth** (`CONVEXCORE-14` identity wiring / **`CONVEXCORE-16`** admin shopId resolver + `auth.adapter.test` migration). **110 → 116 tasks, 15 tracks, still 21 waves.** See *Effort is not uniform* below — task COUNT ≠ effort.
>
> **Revision — graph patch (post-review).** Two kill-gates added to close late-feasibility gaps. **SPIKE-01** — an early throwaway findByDomain edge-latency + Convex cost feasibility spike (wave 2) — gates the first heavy-Convex-investment tasks (`CONVEXCORE-04` / `SFREAD-03` / `CMSDATA-01`), so a fatal latency/cost surprise lands in days, not after the CMS quarter. **CMSRICH-03** — a Lexical→ProseMirror full-corpus round-trip fidelity gate (wave 11) — blocks the CMS content cutovers (`CUTOVER-04/05/06`) until rich-text converts with zero semantic loss. **110 → 112 tasks, 14 → 15 tracks, still 21 waves.** Gates `G-SPIKE` (after wave 2) and `G-RICH` (after wave 11) in [`execution-plan.md`](./execution-plan.md).

---

## Legend

- **id** — stable task id (`<TRACK>-NN`). Referenced by `depends_on` and the wave schedule.
- **size** — S (≤½ day), M (½–2 days). No task exceeds M after the critic splits.
- **depends_on** — hard predecessors. All former `EXTERNAL:` prose is resolved to real ids (critic ordering-risk #1). A leading `↳` note records the rationale where non-obvious.
- **parallel_safe** — `true` ⇒ may run concurrently with siblings in the same wave; `false` ⇒ serialize within its wave (shared-file or sequencing chokepoint).
- **worktree** — `true` ⇒ run in an isolated git worktree (edits files other in-wave tasks also touch, or is a large isolated removal).
- **skills** — capability tags for agent routing.
- **wave** — earliest concurrently-runnable wave (see [`execution-plan.md`](./execution-plan.md)). 1 = zero-dependency starters.

## Per-track summary

| Track | Tasks | Theme | Waves spanned |
|---|---|---|---|
| **SPIKE** | 1 | Early throwaway findByDomain latency + Convex cost feasibility kill-gate (proven before the build commits) | 2 |
| **UNIFY** | 11 | Phase 0 — collapse 3 shop reps + reviews→id + collaborators join, **on Mongo**, shipped first | 1–5 |
| **CONVEXCORE** | 16 | Convex package, schema, RLS deny-default, tenant/system wrappers, auth identity + admin shopId resolver, prod deploy | 1–10 |
| **CMSDESC** | 4 | Convex-native field-descriptor DSL + codegen replacing payload-types.ts/cms:gen | 1–3 |
| **CMSFORM** | 6 | Native form engine (state core, widgets, blocks, 2s autosave no-clobber) | 2–7 |
| **CMSDATA** | 12 | Drafts/versions, localization, access+secrets, 7 actions, runtime, shell, live preview, i18n shred, list pagination, email | 7–12 |
| **CMSMEDIA** | 3 | storage/upload/mime → sharp 4-sizes+focal → CDN URLs + storefront consumption | 9–11 |
| **CMSRICH** | 4 | ProseMirror storage/widget + storefront renderer + lossless conversion codec + full-corpus fidelity gate | 8–11 |
| **CMSGATE** | 2 | HARD PARITY GATES — header depth-6 nav + pages blocks end-to-end | 12 |
| **SFREAD** | 14 | Freeze read contracts; re-home packages/db on Convex; reactivity lanes; CMS dual-read | 1–12 |
| **BRIDGE** | 11 | Durable Convex→Next revalidation bridge (publish-only) | 1–9 |
| **HARNESS** | 11 | @nordcom/commerce-test-convex (build + migrate consumers) | 1–12 |
| **PIPELINE** | 5 | Deterministic idempotent ETL + reconciliation + freeze-window outbox | 6–12 |
| **CUTOVER** | 6 | **One-shot** freeze→export→drain→flip (storefront) + per-cohort coordinated CMS cutover | 12–16 |
| **TEARDOWN** | 10 | Final backup, kill processes, remove Payload + both mongoose majors, scripts/CI/docs, zero-Mongo gate | 17–21 |
| **Total** | **116** | | **21 waves** |

### Effort is not uniform — read this before counting tasks

Task **count is not effort.** Sizes are per-task (S ≤½ day, M ≤2 days), but the work is front-loaded into one cluster:

- **CMS rebuild cluster** (CMSDESC + CMSFORM + CMSDATA + CMSMEDIA + CMSRICH + CMSGATE ≈ 31 tasks) is the program **long pole — roughly a calendar quarter** of the timeline, concentrated in the generic form/field engine (`CMSFORM-01/03/05`), the editor-runtime chain (`CMSDATA-05/06/07`), and the two parity gates (`CMSGATE-01/02`). It is gated **late** (G4, wave 12) with no partial-cutover fallback — the judge panel's named risk. Read each of these as "up to 2 days **if** the engine design holds," not as interchangeable units.
- **UNIFY / CONVEXCORE / SFREAD / BRIDGE / HARNESS** are genuinely M/S-sized and parallelize cleanly through wave ~9.
- **CUTOVER + TEARDOWN** (waves 13–21) are mostly S/M but **serial and operator-driven** — low task-count, high care, not fan-out work.

For a calendar estimate, weight by cluster, not by the 116 count: the CMS cluster dominates; everything else is the supporting cast.

---

## Track SPIKE — early feasibility kill-gate

### SPIKE-01 — findByDomain edge latency + Convex cost feasibility spike (throwaway) · M · wave 2
- **summary:** Throwaway feasibility proof BEFORE the Convex build-out commits, so a fatal latency/cost surprise lands in days not after the CMS quarter. Stand up a minimal Convex deployment (a `shops` table with a `by_domain` index seeded to realistic tenant count) and (1) benchmark `findByDomain` from the Node storefront middleware via `ConvexHttpClient`, cold-miss and warm (TTL/LRU) p50/p99; (2) project storefront read + build-fan-out cost (`generateStaticParams`/sitemap N tenants × M params + cache-miss read rate) against metered Convex pricing. **KILL-CRITERIA:** red p99 or per-tenant call volume over budget ⇒ STOP before `CONVEXCORE-04`/`SFREAD-03`/`CMSDATA-01`. Discard the spike code.
- **files:** packages/convex/ (throwaway spike branch), apps/storefront/src/middleware/storefront.ts (benchmark harness only, reverted)
- **depends_on:** CONVEXCORE-01
- **acceptance:** findByDomain cold-miss p99 ≤ 150ms and warm p50 ≤ 40ms from Node middleware against a realistic-tenant-count Convex deployment, measured + recorded; projected Convex call volume ≤ 50k/tenant/day at current read + build-fan-out shape, cost model written up; explicit GO/NO-GO recorded — on NO-GO the program halts before CONVEXCORE-04 / SFREAD-03 / CMSDATA-01; spike code discarded, not merged.
- **parallel_safe:** true · **worktree:** true · **skills:** convex, perf, cost

---

## Track UNIFY — Phase 0 schema unification (ships first, on Mongo)

### UNIFY-01 — tenantsSlug repoint feasibility spike (GATE) · M · wave 1
- **summary:** Time-boxed throwaway spike gating the track. Prove `@payloadcms/plugin-multi-tenant` can repoint `tenantsSlug` from `tenants` to the unified `shops` collection with the tenant key = the shop row id, and that tenant-scoped reads/writes still resolve. Determine whether Mongoose `Shop` model and the Payload `shops` collection already share the same Mongo collection/`_id` (Mongoose pluralizes `Shop`→`shops`); if so the collapse makes `resolveTenantId` an identity function. Verify the injected `tenant` relationship field writes/filters on the shop row id and `getTenantFromCookie('payload-tenant','text')` still resolves. Record go/no-go + chosen collapse mechanism. Spike branch is NOT merged; only the findings doc lands.
- **files:** packages/cms/src/plugins/multi-tenant.ts, packages/cms/src/collections/shops.ts, packages/cms/src/collections/tenants.ts, packages/cms/src/config/index.ts, packages/db/src/models/shop.ts, .specs/2026-05-30-convex-migration/phase0-tenantslug-spike.md
- **depends_on:** —
- **acceptance:** written go/no-go + chosen mechanism in phase0-tenantslug-spike.md; documented whether Mongoose `shops` and Payload `shops` resolve to the same Mongo collection + identical `_id`; throwaway proof that a `pages` read filtered `where:{tenant:{equals:<shopRowId>}}` returns the seeded doc with `tenantsSlug:'shops'`; `getTenantFromCookie` resolves the shop-row-id key; spike branch unmerged, only findings doc on the track branch.
- **parallel_safe:** false · **worktree:** true · **skills:** payload, multi-tenant, mongoose, spike

### UNIFY-02 — Freeze CMS read contract with characterization tests · M · wave 1
- **summary:** Lock current behavior of the read path the collapse touches. Extend `resolve-tenant-id.test.ts` (null-on-missing + WeakMap cache + exact `where:{shopId:{equals}}` shape); pin the `where:{tenant:{equals:tenantId}}` filter shape emitted by all 9 getters incl the `__cms_no_tenant_resolved__` sentinel path; assert null-on-missing does not 404. On the Mongoose side freeze `Review.findByShop`/`findAll` return shapes. These are the regression gate for UNIFY-04/06.
- **files:** packages/cms/src/api/resolve-tenant-id.test.ts, packages/cms/src/api/api.test.ts, packages/db/src/services/review.test.ts
- **depends_on:** —
- **acceptance:** `pnpm test --project @nordcom/commerce-cms` green pinning each getter tenant-filter shape + sentinel branch; `pnpm test --project @nordcom/commerce-db` green pinning Review shapes; null-on-missing asserted for ≥ get-page + get-header; additive-only (no source under api/ or services/ modified).
- **parallel_safe:** true · **worktree:** false · **skills:** tests, payload, characterization

### UNIFY-03 — Unify tenant collection: repoint tenantsSlug→shops, delete tenants · M · wave 2
- **summary:** Implement the spike's chosen mechanism. Set `tenantsSlug:'shops'`; configure the Payload `shops` collection as the multi-tenant tenant collection (shop == tenant, one canonical record keyed on the shop row id). Delete `tenants.ts` + `tenants.test.ts`, remove from collections/index.ts. Ensure Payload `shops` reads/writes the same canonical Mongo `shops` docs as the Mongoose model; keep secret-guard hooks. Do NOT touch resolveTenantId call sites (UNIFY-04).
- **files:** packages/cms/src/plugins/multi-tenant.ts, packages/cms/src/collections/tenants.ts, packages/cms/src/collections/index.ts, packages/cms/src/collections/shops.ts, packages/cms/src/config/index.ts
- **depends_on:** UNIFY-01
- **acceptance:** grep for `collection:'tenants'`/`slug:'tenants'` clean except remnants slated for UNIFY-04/05; tenantsSlug is 'shops'; tenants.ts + test deleted; `pnpm build:packages` + `pnpm test --project @nordcom/commerce-cms` green; admin Payload config still constructs; injected `tenant` field resolves to the shop row id on a seeded fixture.
- **parallel_safe:** true · **worktree:** true · **skills:** payload, multi-tenant

### UNIFY-04 — Collapse resolveTenantId to identity + update where:{tenant:{equals}} call sites · M · wave 3
- **summary:** With shop == tenant, rewrite `resolve-tenant-id.ts` to return the shop id directly (identity) — or delete+inline — preserving null-on-empty and the public export. Update the 9 getters + remaining consumers (admin content/collection-metadata/product-metadata pages, editor/revalidate.ts, editor-list-page.tsx, assert-shop.ts) so the tenant value is the canonical shop id, keeping the sentinel path. Remove the WeakMap cache if identity makes it dead. UNIFY-02 tests stay green.
- **files:** packages/cms/src/api/resolve-tenant-id.ts(+test), packages/cms/src/api/get-{page,pages,article,articles,header,footer,business-data,product-metadata,collection-metadata}.ts, packages/cms/src/editor/revalidate.ts, packages/cms/src/editor/ui/editor-list-page.tsx, apps/admin/src/app/(app)/(dashboard)/[domain]/content/page.tsx
- **depends_on:** UNIFY-01, UNIFY-02, UNIFY-03
- **acceptance:** resolveTenantId returns shop id for existing, null for missing (UNIFY-02 contract preserved); `pnpm test --project @nordcom/commerce-cms` + `pnpm typecheck` green across cms + admin; 9 getters return seeded content filtering by canonical shop id; grep for `Tenant._id`/`extra Mongo round-trip` in resolve-tenant-id.ts empty.
- **parallel_safe:** true · **worktree:** true · **skills:** payload, multi-tenant, tests

### UNIFY-05 — Delete attachShopSync write-path sync + shop-sync package surface · S · wave 3
- **summary:** Remove the live Mongoose post-save sync. Delete `shop-sync/{post-save-hook,index,post-save-hook.test}.ts`; remove the `attachShopSync` import + call site at payload.config.ts:7/95; drop the now-unused `Shop` import if dead; remove the `@nordcom/commerce-cms/shop-sync` export. Confirm admin boots without the hook.
- **files:** apps/admin/src/payload.config.ts, packages/cms/src/shop-sync/{post-save-hook,index,post-save-hook.test}.ts, packages/cms/package.json
- **depends_on:** UNIFY-03
- **acceptance:** grep `attachShopSync|syncShopToTenant|shop-sync` (excl .specs) empty; shop-sync/ deleted, no dangling export; `pnpm build:packages` + `pnpm typecheck` green (no unused Shop import); cms tests green.
- **parallel_safe:** true · **worktree:** true · **skills:** payload-removal, mongoose

### UNIFY-06 — Reviews → shopId relationship (Mongoose side) · M · wave 2
- **summary:** Replace the embedded `ShopSchema` snapshot in `models/review.ts` with a `shop` id reference, killing the denorm-drift class. Update `ReviewBase` so `shop` is the id; fix `findByShop` against the id field; resolve the dead `findAll({tenant})` filter (carry intent or drop deliberately, with a comment). Adjust `docToReview` if it assumed an embedded shop. Keep method signatures identical (~183-importer seam untouched). UNIFY-02 review tests are the regression gate.
- **files:** packages/db/src/models/review.ts, packages/db/src/services/review.ts(+test), packages/db/src/lib/doc-to-shape.ts
- **depends_on:** UNIFY-02
- **acceptance:** ReviewSchema stores `shop` as id ref; grep `ShopSchema` in review.ts empty; `findByShop` matches by id, signature preserved; dead `tenant` filter resolved with a comment; `pnpm test --project @nordcom/commerce-db` + `pnpm build:packages` green; no Review export signature change.
- **parallel_safe:** true · **worktree:** false · **skills:** mongoose, data-modeling, tests

### UNIFY-07 — Reviews → shop relationship aligned (Payload side) · S · wave 3
- **summary:** Ensure the Payload `reviews` collection `shop` relationship resolves to the canonical `shops` tenant collection. Drop the `as never` cast on `relationTo:'shops'` if unneeded; keep tenant-scoped access predicates; verify the injected `tenant` field (now keyed on the shop row id) and the explicit `shop` relation are consistent.
- **files:** packages/cms/src/collections/reviews.ts
- **depends_on:** UNIFY-03
- **acceptance:** reviews.shop references canonical 'shops'; relation resolves a seeded review's shop; access predicates unchanged + passing; `pnpm build:packages` + cms tests green; no Tenant-vs-Shop split remains for reviews.
- **parallel_safe:** true · **worktree:** true · **skills:** payload, data-modeling

### UNIFY-11 — De-embed collaborators → join + rewrite findByCollaborator + migrate arrays · M · wave 3
- **summary:** *(ADDED — critic missing #7; plan.md Phase 0 step 4.)* Move the embedded `collaborators` array on the shop into a join shape and rewrite `Shop.findByCollaborator` to the new return shape, preserving the public method signature so the ~183-importer seam holds. Provide an in-place Mongo migration of existing collaborator arrays (folded into UNIFY-08's backfill). This is the canonical join shape `CONVEXCORE-04` mirrors.
- **files:** packages/db/src/models/shop.ts, packages/db/src/services/shop.ts, packages/db/src/services/shop.test.ts, packages/db/src/lib/doc-to-shape.ts
- **depends_on:** UNIFY-02, UNIFY-03
- **acceptance:** collaborators stored as a join (not embedded array) with the canonical shape documented; `findByCollaborator(userId)` preserves signature/return type and resolves seeded collaborators; `pnpm test --project @nordcom/commerce-db` + `pnpm build:packages` green; no importer compile change.
- **parallel_safe:** true · **worktree:** true · **skills:** mongoose, data-modeling, tests

### UNIFY-08 — Migration-1 backfill script (idempotent, re-runnable) on Mongo · M · wave 4
- **summary:** Standalone idempotent in-place backfill: (1) rewrite every embedded-ShopSchema review to the `shopId` shape; (2) reconcile tenant linkage to the unified shop-row-id identity for tenant-scoped collections; (3) convert embedded collaborator arrays to the join shape (UNIFY-11). `--dry-run` reports counts without writing; second run is a no-op. Transform core kept pure for Phase 7 ETL reuse.
- **files:** scripts/migrate-1-unify-shop-tenant.ts, scripts/migrate-1-reviews-shopid.ts, scripts/migrate-1-collaborators-join.ts
- **depends_on:** UNIFY-03, UNIFY-06, UNIFY-07, UNIFY-11
- **acceptance:** dry-run prints exact counts (reviews, tenant links, collaborator arrays), writes nothing; first run converts all; post-run zero embedded-shop review docs + zero embedded collaborator arrays; second run 0 changes; every tenant-scoped doc resolves to a valid canonical shop id; transform core pure/exported.
- **parallel_safe:** false · **worktree:** false · **skills:** data-migration, mongoose

### UNIFY-09 — Update Mongo seed + e2e global-setup to the unified tenant=shop identity · M · wave 4
- **summary:** Fix teardown trap #26: the shopId↔tenantId mapping in test-mongo seed/{cms,canonical}.ts + both apps' e2e/global-setup.ts. Stop creating a separate `tenants` row; make the tenant identity = the seeded shop's row id so storefront CMS reads (now filtered by shop id) return non-null. Keep emitting `E2E_TENANT_ID` (= shop id). Keep admin NextAuth JWT cookie logic intact.
- **files:** packages/test-mongo/src/seed/cms.ts, packages/test-mongo/src/seed/canonical.ts, apps/storefront/e2e/global-setup.ts, apps/admin/e2e/global-setup.ts
- **depends_on:** UNIFY-03, UNIFY-06, UNIFY-07
- **acceptance:** seed no longer creates a `tenants` doc; tenant-scoped CMS docs seeded against the shop row id; `E2E_TENANT_ID` exported = seeded shop id; storefront e2e CMS read returns non-null; grep `collection:'tenants'` in test-mongo/e2e empty; admin NextAuth cookie minting unchanged.
- **parallel_safe:** true · **worktree:** false · **skills:** tests, e2e, data-migration

### UNIFY-10 — Migration-1 verification, parity gate, ship sign-off · S · wave 5
- **summary:** Phase 0 exit gate proving admin + storefront run on the unified Mongo schema. Assert: attachShopSync gone, single canonical shop==tenant record, resolveTenantId identity (or removed), reviews via shopId, collaborators join, featureFlags reads work. Lightweight parity assertion that pre/post-migration storefront CMS reads return identical shapes (null-on-missing preserved). Confirm `pnpm build:packages && pnpm typecheck && pnpm test` + e2e seed green. No changeset required.
- **files:** packages/cms/src/api, packages/db/src/services, .specs/2026-05-30-convex-migration/phase0-verification.md
- **depends_on:** UNIFY-04, UNIFY-05, UNIFY-08, UNIFY-09, UNIFY-11
- **acceptance:** build+typecheck+test all green; grep `attachShopSync|syncShopToTenant` (excl .specs) empty, tenants collection absent; parity shapes recorded in phase0-verification.md; reviews/featureFlags/collaborators read over canonical tables; no-changeset confirmed.
- **parallel_safe:** false · **worktree:** false · **skills:** tests, ci, verification

---

## Track CONVEXCORE — Convex package, schema & multi-tenant safety core

### CONVEXCORE-01 — Bootstrap @nordcom/commerce-convex package + deps + codegen + env · M · wave 1
- **summary:** New workspace package `packages/convex` (`@nordcom/commerce-convex`), consumed `workspace:*` by apps + packages/db. Deps `convex`, `convex-helpers`, `convex-test`(dev). Add `convex.json` (functions dir `packages/convex/convex/`), tsconfig, exports re-exporting generated `_generated/{api,server}`; wire `convex codegen` into the build. Add `CONVEX_URL`/`CONVEX_DEPLOY_KEY`/`NEXT_PUBLIC_CONVEX_URL` to the 3 `.env.example`. **Single Convex function root — all later convex functions live under `packages/convex/convex/**` (ordering-risk #3).** No changeset.
- **files:** packages/convex/{package.json,convex.json,tsconfig.json}, packages/convex/convex/.gitkeep, pnpm-workspace.yaml, .env.example, apps/storefront/.env.example, apps/admin/.env.example
- **depends_on:** —
- **acceptance:** `pnpm install` resolves, `pnpm why -r convex` finds convex+convex-helpers; `convex codegen` emits `_generated/{api,server,dataModel}.d.ts`; `pnpm build:packages` builds the package; CONVEX_URL/NEXT_PUBLIC_CONVEX_URL present in all 3 env files; `pnpm install --frozen-lockfile` passes, no changeset.
- **parallel_safe:** false · **worktree:** false · **skills:** convex, monorepo, env

### CONVEXCORE-02 — Self-host Convex backend for CI + gated `convex deploy` + export cron · M · wave 2
- **summary:** Wire the open-source self-hosted Convex backend as the CI/exit target. Add `convex:deploy`/`convex:dev` scripts + root delegates; gate `convex deploy` to config/function edits in CI. Pre-build/cache the local-backend binary as a CI artifact in the shared composite bootstrap action so per-job boot is spawn-only. Add the scheduled `convex export` snapshot-to-object-storage cron (cost guardrail).
- **files:** packages/convex/package.json, package.json, .github/workflows/ci.yml, .github/common/bootstrap/action.yml, packages/convex/convex/crons.ts
- **depends_on:** CONVEXCORE-01
- **acceptance:** `pnpm convex:deploy` pushes schema+functions to the self-hosted/local backend; CI restores the cached binary (cache-hit logged), boots without download; deploy step skipped when no `packages/convex/**` change, runs when there is; export cron registered + visible.
- **parallel_safe:** true · **worktree:** false · **skills:** convex, ci, self-host

### CONVEXCORE-03 — Schema scaffold: composition convention + shared validators + tenant-index naming · M · wave 2
- **summary:** Author `schema.ts` as a `defineSchema` spreading per-group table maps from `tables/*` modules (so table-group tasks add **isolated module files** — enforces ordering-risk #4: no parallel task edits schema.ts directly). Reserve an explicit `...cmsTables` slot. Build shared validators: a theme-tokens validator mirroring `lib/theme.ts` + `lib/theme-catalog.ts` exactly, and a JsonValue/TargetingRule validator mirroring `lib/feature-flag.ts`. Document the tenant-prefixed compound-index naming convention (`by_shop_<field>` equality-prefix + single trailing range).
- **files:** packages/convex/convex/schema.ts, packages/convex/convex/tables/index.ts, packages/convex/convex/lib/validators.ts
- **depends_on:** CONVEXCORE-01
- **acceptance:** `convex codegen` + typecheck green with placeholder schema; theme validator round-trips a full ResolvedShopTheme fixture (every key accepted, unknown rejected); JsonValue validator accepts the FeatureFlag Mixed shapes; schema.ts spreads named table-group maps + has a documented cmsTables extension point.
- **parallel_safe:** true · **worktree:** false · **skills:** convex, validators

### CONVEXCORE-04 — Shop-family tables: collapsed shop+tenant, credentials, domains, side-tables, featureFlags · M · wave 4
- **summary:** Define `tables/shops.ts` and register it. `shops` = shop AND tenant (tenant identity = row `_id`) carrying name/domain/design/commerce/icons/i18n/theme(validator)/integrations/thirdParty + `legacyId` (Mongo ObjectId projected to shop.id); `shopCredentials`(1:1, by_shop) holding the token + clientSecret in a SEPARATE table so the public shops query physically cannot read secrets; `shopDomains`(by_domain) one row per domain→shopId; `shopCollaborators`(by_user, by_shop) mirroring the **UNIFY-11 join shape**; `shopFeatureFlags`(by_shop) + global `featureFlags`(by_key). Tenant-prefixed compound indexes per CONVEXCORE-03. Mirror the POST-Phase-0 unified shape.
- **files:** packages/convex/convex/tables/shops.ts, packages/convex/convex/schema.ts
- **depends_on:** CONVEXCORE-03, UNIFY-03, UNIFY-11, SPIKE-01 *(↳ schema mirrors the unified shop=tenant + legacyId + collaborators-join shape, not the 3-rep shape; SPIKE-01 = feasibility kill-gate before this first heavy Convex-schema commitment)*
- **acceptance:** codegen + typecheck green; shopCredentials distinct (by_shop), no token/clientSecret on `shops`; shopDomains by_domain, shopCollaborators by_user+by_shop, featureFlags by_key; shops carries `legacyId` + by_shop_* compound indexes; a Doc<'shops'> fixture matching the unified ShopBase validates.
- **parallel_safe:** false · **worktree:** true · **skills:** convex, schema, multi-tenancy

### CONVEXCORE-05 — Auth + reviews tables: users, sessions, identities, reviews · M · wave 3
- **summary:** Define `tables/auth.ts` + `tables/reviews.ts`, register them. Platform-global auth: `users`(by_email), `sessions`(by_token, by_user, by_expiry; user: v.id('users')), `identities`(by_provider_identity, uniqueness enforced in the mutation). `reviews`(by_shop) storing `shopId: v.id('shops')` (no embedded ShopSchema snapshot). Keep UserBase/SessionBase/IdentityBase/ReviewBase TS contracts importable.
- **files:** packages/convex/convex/tables/auth.ts, packages/convex/convex/tables/reviews.ts, packages/convex/convex/schema.ts
- **depends_on:** CONVEXCORE-03, UNIFY-06, SFREAD-02 *(↳ reviews→shopId baked; auth Base shapes frozen)*
- **acceptance:** codegen + typecheck green; sessions by_token+by_user+by_expiry, identities by_provider_identity, users by_email, reviews by_shop; reviews stores `shopId: v.id('shops')` with no embedded snapshot; auth tables registered outside any tenant-scoped grouping.
- **parallel_safe:** false · **worktree:** true · **skills:** convex, schema, auth

### CONVEXCORE-06 — Fail-closed RLS rules: tenantRules(shopId) + wrap…(defaultPolicy:'deny') · M · wave 5
- **summary:** Build `lib/rls.ts`: convex-helpers `wrapDatabaseReader/Writer(ctx, ctx.db, tenantRules(shopId), {defaultPolicy:'deny'})`. `tenantRules` per tenant-scoped table (shops/shopCredentials/shopDomains/shopCollaborators/shopFeatureFlags/reviews); a table with no rule is denied by construction. Auth tables + global featureFlags intentionally not given tenant rules (served by systemQuery). Rules pair with `.withIndex('by_shop…')` range-bounding, not predicate-only filtering.
- **files:** packages/convex/convex/lib/rls.ts
- **depends_on:** CONVEXCORE-04, CONVEXCORE-05
- **acceptance:** rls.ts exports tenantRules(shopId) covering all tenant-scoped tables + a wrapped reader/writer factory (deny default); convex-test: a tenant-scoped read with no matching shopId returns nothing (range-bounded); a table with no rule denies; typecheck green.
- **parallel_safe:** true · **worktree:** false · **skills:** convex, convex-helpers, rls, multi-tenancy

### CONVEXCORE-07 — tenantQuery / tenantMutation constructors with server-trusted shopId provenance · M · wave 6
- **summary:** Build `lib/tenant.ts`: `tenantQuery = customQuery(query, customCtx(...))`, `tenantMutation = customMutation(mutation, customCtx(...))`, composing the CONVEXCORE-06 wrapped reader/writer. `customCtx` pins `ctx.shopId` from SERVER-TRUSTED context only — Convex auth identity for admin (via CONVEXCORE-14), server-resolved shopId for storefront — NEVER a spoofable client arg.
- **files:** packages/convex/convex/lib/tenant.ts
- **depends_on:** CONVEXCORE-06, CONVEXCORE-14 *(↳ admin shopId provenance comes from the auth-identity resolver)*
- **acceptance:** exports tenantQuery + tenantMutation injecting ctx.shopId via customCtx over the wrapped db; convex-test proves tenantQuery cannot read another tenant's rows even if a shopId arg is passed (arg ignored); a tenantMutation under tenant A is invisible to a tenantQuery under tenant B; typecheck green.
- **parallel_safe:** true · **worktree:** false · **skills:** convex, convex-helpers, multi-tenancy

### CONVEXCORE-08 — systemQuery / systemMutation escape hatch (no-RLS, server-trusted) · S · wave 3
- **summary:** Build `lib/system.ts`: `systemQuery`/`systemMutation` over the raw db (no tenant RLS) for explicitly-exempt paths — crons, migrations/backfills, resolveShop/shops.byDomainWithCredentials, platform-global auth tables, global featureFlags, super-user cross-tenant admin. The only sanctioned raw-db access; MUST originate server-side. Document each exemption.
- **files:** packages/convex/convex/lib/system.ts
- **depends_on:** CONVEXCORE-03
- **acceptance:** exports systemQuery + systemMutation bypassing tenant RLS; convex-test proves systemQuery reads users/sessions/featureFlags (tenant rules deny) and writes across tenants; constructors exported only via the internal surface, not the public app barrel (verified by CONVEXCORE-09/10); typecheck green.
- **parallel_safe:** true · **worktree:** false · **skills:** convex, convex-helpers

### CONVEXCORE-09 — Public function-constructor barrel: export only tenant*/system*, withhold raw query/mutation · S · wave 7
- **summary:** Single import surface (`_constructors.ts` re-exported via the package server export) re-exporting ONLY tenantQuery/tenantMutation/systemQuery/systemMutation. Raw query/mutation/internalQuery/internalMutation are deliberately NOT re-exported, so the barrel cannot bypass RLS. Update package.json exports so apps + packages/db import from this barrel, never `_generated/server`.
- **files:** packages/convex/convex/_constructors.ts, packages/convex/package.json
- **depends_on:** CONVEXCORE-07, CONVEXCORE-08
- **acceptance:** barrel re-exports exactly the 4 constructors, nothing from raw `_generated/server`; typecheck green; importing `query` via the barrel fails to resolve; package.json exports maps the barrel as the documented entrypoint.
- **parallel_safe:** true · **worktree:** false · **skills:** convex, packaging

### CONVEXCORE-10 — CI-blocking barrel/lint gate forbidding raw query/mutation in app modules · M · wave 8
- **summary:** Biome `noRestrictedImports` rule (override exempting only `convex/lib/{tenant,system,rls}.ts`) forbidding any import of `query`/`mutation`/`internalQuery`/`internalMutation` from `_generated/server` (or convex internals) in app/db modules. CI-BLOCKING, not advisory. Wire into `pnpm lint`. Add a deliberately-bad fixture proving the gate fires.
- **files:** biome.json, packages/convex/convex/__fixtures__/raw-query-violation.ts, .github/workflows/ci.yml
- **depends_on:** CONVEXCORE-09
- **acceptance:** `pnpm lint` fails on the raw-query fixture, passes once it imports the barrel; override exempts only the 3 wrapper files; CI lint job blocking on this rule.
- **parallel_safe:** true · **worktree:** false · **skills:** lint, biome, ci

### CONVEXCORE-11 — Subscription registry + per-tenant circuit breaker in the wrappers · M · wave 7
- **summary:** `lib/subscription-registry.ts` wired into tenantQuery/tenantMutation: track open subscriptions per tenant, stop opening new sockets past a configurable per-tenant threshold and fall back to snapshot+poll, emit the per-tenant cost/usage metric (net-new — Convex has no native per-tenant cap). Threshold + fallback deterministic + observable.
- **files:** packages/convex/convex/lib/subscription-registry.ts, packages/convex/convex/lib/tenant.ts
- **depends_on:** CONVEXCORE-07
- **acceptance:** a test drives the registry past threshold and asserts new subscriptions degrade to snapshot+poll; the per-tenant metric is emitted + assertable; breaker resets below threshold; typecheck green.
- **parallel_safe:** true · **worktree:** false · **skills:** convex, observability, multi-tenancy

### CONVEXCORE-12 — Phase 2 exit-criteria verification suite (deny-default + escape-hatch + barrel) · M · wave 9
- **summary:** convex-test suite proving Phase 2 exit criteria: (a) a query against a no-rule table is denied; (b) a tenant cannot read/write another tenant's rows; (c) systemQuery reads the exempt internal/auth/global tables; (d) deny holds when shopId is passed as an ignored client arg. The load-bearing proof the orchestrator gates the track on.
- **files:** packages/convex/convex/__tests__/{rls-deny-default,system-escape-hatch}.test.ts
- **depends_on:** CONVEXCORE-06, CONVEXCORE-07, CONVEXCORE-08, CONVEXCORE-09, CONVEXCORE-10
- **acceptance:** `pnpm test --project @nordcom/commerce-convex` green; deny-default test fails if a rule is removed (load-bearing); cross-tenant read+write asserted blocked; systemQuery exempt-table access asserted allowed.
- **parallel_safe:** true · **worktree:** false · **skills:** convex, tests, convex-test

### CONVEXCORE-13 — Expand/contract deploy dry-run + backfill mutation runner · M · wave 5
- **summary:** Schema-evolution safety net (substitutes for a deferred migrate CLI): add-optional → backfill → tighten with a `convex deploy` dry-run validating existing rows against a tightening change before promotion (rejects a deploy that would invalidate live rows), plus a generic backfill mutation runner (`lib/migrations.ts`) that paginates a table and applies a transform idempotently. Script entrypoint to run a named backfill against the local backend.
- **files:** packages/convex/convex/lib/migrations.ts, packages/convex/scripts/deploy-dry-run.ts, packages/convex/package.json
- **depends_on:** CONVEXCORE-02, CONVEXCORE-04, CONVEXCORE-05
- **acceptance:** dry-run flags a tightening change that would reject rows + exits non-zero before promotion; backfill runner paginates + applies idempotently (re-run no-op, asserted); `pnpm convex:backfill <name>` invokes the runner.
- **parallel_safe:** true · **worktree:** false · **skills:** convex, data-migration

### CONVEXCORE-14 — NextAuth-JWT → Convex auth identity wiring · M · wave 4
- **summary:** *(ADDED — critic missing #2; admin multi-shop tenant selector + `auth.adapter.test` split to CONVEXCORE-16.)* Build `convex/auth.config.ts` (JWT issuer/applicationID validation so `ctx.auth.getUserIdentity()` works), the basic identity→`ctx.shopId` resolution (single-collaborator case) that tenantQuery's server-trusted provenance depends on (spec §1.4/§4), and the `ConvexReactClient` `setAuth` fetcher + NextAuth-JWT token refresh the reactive islands need. Without this tenantQuery/tenantMutation cannot pin shopId and SFREAD-08's island cannot authenticate.
- **files:** packages/convex/convex/auth.config.ts, packages/convex/convex/lib/auth.ts, apps/admin/src/lib/convex-auth.ts, apps/storefront/src/lib/convex-auth-fetcher.ts
- **depends_on:** CONVEXCORE-05, CONVEXCORE-08
- **acceptance:** `getUserIdentity()` validates a NextAuth-minted JWT (issuer/appId asserted); admin identity resolves to a single `ctx.shopId` via the collaborator→shop lookup (systemQuery), never a client arg; the storefront setAuth fetcher round-trips a token refresh; convex-test covers identity→shopId resolution + a rejected forged token.
- **parallel_safe:** true · **worktree:** false · **skills:** convex, auth, nextauth

### CONVEXCORE-15 — Production Convex deploy provisioning + Vercel env + deploy/release wiring · M · wave 10
- **summary:** *(ADDED — critic missing #8.)* Provision the production Convex deployment (self-hosted exit target per spec §5), set the Vercel project env (`NEXT_PUBLIC_CONVEX_URL`/`CONVEX_DEPLOY_KEY`, which live in Vercel settings per teardown E), and wire `convex deploy` into `deploy.yml`/`release.yml` (sharing the bootstrap composite action). Satisfies every "Convex deployment provisioned with CONVEX_URL" reference for the production cutover.
- **files:** .github/workflows/deploy.yml, .github/workflows/release.yml, .github/common/bootstrap/action.yml, .specs/2026-05-30-convex-migration/convex-prod-provisioning.md
- **depends_on:** CONVEXCORE-02, CONVEXCORE-12
- **acceptance:** prod deployment provisioned + URL/deploy-key recorded; Vercel env documented + set; `convex deploy` runs in deploy/release on config change; a deploy dry-run against prod passes; provisioning doc committed.
- **parallel_safe:** true · **worktree:** false · **skills:** convex, ci, infra

### CONVEXCORE-16 — Admin shopId provenance resolver + auth.adapter.test migration · M · wave 7
- **summary:** *(SPLIT from CONVEXCORE-14 — the admin-side tail.)* Resolve the active tenant/shopId for admin requests from the trusted session (the `payload-tenant`-cookie analog) so admin editor actions scope correctly via `tenantMutation` — including the multi-shop collaborator selection case; migrate `apps/admin/src/utils/auth.adapter(.test)` off the Mongo Auth.js adapter to the Convex shapes. The admin-side counterpart to CONVEXCORE-14's identity wiring.
- **files:** apps/admin/src/utils/auth.adapter.ts, apps/admin/src/utils/auth.adapter.test.ts, packages/convex/convex/auth/admin-shop-resolver.ts
- **depends_on:** CONVEXCORE-14, CONVEXCORE-07
- **acceptance:** admin requests resolve a server-trusted shopId (never a client arg), incl the multi-collaborator selection path; admin editor mutations scope to it via `tenantMutation`; `auth.adapter.test` passes against Convex shapes with no mongoose import.
- **parallel_safe:** true · **worktree:** false · **skills:** convex, auth, tests

---

## Track CMSDESC — Convex-native field-descriptor DSL + codegen

### CMSDESC-01 — Field-descriptor type system + field builders · M · wave 1
- **summary:** Convex-native field-descriptor DSL replacing Payload's `Field` type as the single source of truth. Cover every field kind: text/textarea/select/checkbox/number/date/email/json/code/relationship/upload/array/group/blocks/collapsible + flags `localized`/`required`/`condition(data,sibling)`. Port the field builders in `packages/cms/src/fields/` (seoGroup, imageField, linkField+LinkRef, navItemField/topLevelNavItemField + HEADER_VARIANTS) to emit descriptors, preserving the recursive `buildChildItems` depth parameter. CMS-safe (no React/Payload imports) so the block-loader firewall + packages/db registries stay importable.
- **files:** packages/cms/src/fields/{index,seo,image,link,nav-item}.ts, packages/cms/src/descriptors/
- **depends_on:** —
- **acceptance:** descriptor module compiles with cms typecheck + imports zero payload/@payloadcms symbols (grep clean); unit suite per field-kind + depth-6 navItemField recursion + linkField LinkRef union green; biome passes; field-builder export names/signatures unchanged so downstream imports resolve.
- **parallel_safe:** true · **worktree:** false · **skills:** convex, typescript, payload-removal, tests

### CMSDESC-03 — Re-express 13 collections as descriptors · M · wave 2
- **summary:** *(SPLIT from old CMSDESC-02.)* Re-express all 13 collection configs (`collections/*` incl `_globals` header/footer/businessData) as CMSDESC-01 descriptors. Preserve the 35 localized-field set and the tenant-scoped/secret-guard metadata.
- **files:** packages/cms/src/collections/
- **depends_on:** CMSDESC-01
- **acceptance:** all 13 collections resolve to descriptors; a snapshot test asserts the 35 localized-field set preserved; cms typecheck + biome green; no payload/@payloadcms import in the descriptor outputs.
- **parallel_safe:** true · **worktree:** true · **skills:** convex, payload-removal, tests

### CMSDESC-04 — Re-express 9 blocks as descriptors · M · wave 2
- **summary:** *(SPLIT from old CMSDESC-02.)* Re-express the 9 block defs (`blocks/*`, ordered by `registry.ts` BLOCK_TYPES) as descriptors, incl the nested `columns` block whose `content` embeds every other block.
- **files:** packages/cms/src/blocks/
- **depends_on:** CMSDESC-01
- **acceptance:** all 9 blocks resolve to descriptors; a snapshot test asserts BLOCK_TYPES order preserved; adding a block forces a compile error until wired; cms typecheck + biome green.
- **parallel_safe:** true · **worktree:** true · **skills:** convex, payload-removal, tests

### CMSDESC-02 — Descriptor-driven codegen engine + drift gate (replaces payload-types.ts / cms:gen) · M · wave 3
- **summary:** *(SPLIT — the load-bearing read-contract producer.)* Build the codegen replacing `payload generate:types`+`payload-types.ts` and the per-collection `cms:gen` action codegen: emit (a) the TS content shapes the 11 storefront getters consume and (b) the Convex content-table validators that merge into the Phase-2 schema's `cmsTables` slot. Replace `types/generate-types-config.ts` (hardcoded mongo URI) + `cms:gen`/`cms:gen:check` with descriptor-driven generators + a drift gate. **FREEZES the storefront read contract: getter return types compile unchanged against the emitted shapes.**
- **files:** packages/cms/src/types/payload-types.ts, packages/cms/src/types/generate-types-config.ts, packages/cms/scripts/cms-gen.ts, packages/cms/scripts/cms-gen-check.ts
- **depends_on:** CMSDESC-01, CMSDESC-03, CMSDESC-04, CONVEXCORE-03 *(↳ emits validators into the schema cmsTables slot)*
- **acceptance:** replacement codegen runs with no Payload/mongo adapter; re-pointed `pnpm cms:gen:check` passes + fails on intentional descriptor drift; the 11 getters typecheck unchanged against emitted shapes (read contract frozen); emitted validators register into the convex/ cmsTables slot.
- **parallel_safe:** true · **worktree:** false · **skills:** convex, codegen, payload-removal, tests

---

## Track CMSFORM — Native form engine

### CMSFORM-01 — Native form-state core + dispatch registry · M · wave 2
- **summary:** Rebuild the client form runtime from `@payloadcms/ui`: a FormState keyed by dotted paths, a `<Form action>`-equivalent serializing a `_payload` blob, `useField`/`useForm`/`useFormModified` hooks, the dispatch reducer (incl `REPLACE_STATE`), and the provider chain. Carry over the debugged keystroke-clobber guard (`InitialStateGate` commits new server `initialState` only when `useFormModified()` is false) + dirty tracking. Establish the extensible field-renderer dispatch registry (the `RenderFields` replacement) so widget tasks self-register. Reuse the existing `packages/cms/src/ui/` shell chrome.
- **files:** packages/cms/src/editor/form/, packages/cms/src/ui/payload-field-shell{,-inner}.tsx, apps/admin/src/components/cms/document-form-body.tsx, apps/admin/src/lib/build-cms-form-state.ts
- **depends_on:** CMSDESC-01
- **acceptance:** reducer + useField/useForm/useFormModified suite green; regression test proving a fresh server initialState does NOT clobber an in-flight dirty field (InitialStateGate), fails if the gate is removed; no `@payloadcms/ui` import in the new form-core (grep clean); biome + typecheck pass.
- **parallel_safe:** true · **worktree:** false · **skills:** react, convex, payload-removal, forms, tests

### CMSFORM-02 — Leaf field widgets: scalar kinds · M · wave 3
- **summary:** *(SPLIT — scalar half.)* Leaf widgets bound to CMSFORM-01 state + registered in the dispatch registry: text, textarea, select, checkbox, number, date, email, json, code. Reuse the admin UI primitives (`components/ui/{select,switch,accordion,color-field}.tsx` + button/command/dropdown). Each reads/writes via `useField(path)`, surfaces validation/required, respects descriptor `condition`.
- **files:** packages/cms/src/editor/form/fields/, apps/admin/src/components/ui/{select,switch}.tsx
- **depends_on:** CMSFORM-01, CMSDESC-01
- **acceptance:** per-widget render+edit unit tests (one per kind) green; a checkbox/json/select round-trips through form state; a `condition`-hidden widget is excluded from render + from the `_payload` blob (test); no `@payloadcms/ui` import; typecheck + biome pass.
- **parallel_safe:** true · **worktree:** true · **skills:** react, forms, payload-removal, tests

### CMSFORM-06 — Data-bound pickers: relationship + upload · M · wave 7
- **summary:** *(SPLIT from CMSFORM-02 — the two data-coupled widgets.)* `relationship` (doc picker) queries the Convex content tables for options; `upload` (media picker) binds to the CMSMEDIA-01 upload action **through its interface** (full upload e2e deferred to CMSGATE-02). Both bound to CMSFORM-01 state + the dispatch registry, respecting `condition`/required.
- **files:** packages/cms/src/editor/form/fields/{relationship,upload}.tsx
- **depends_on:** CMSFORM-02, CONVEXCORE-07
- **acceptance:** relationship widget lists options from a Convex content-table query + writes the selected id; upload widget calls the upload action interface + stores the returned media id; condition-gating honored; no `@payloadcms/ui` import; typecheck + biome pass.
- **parallel_safe:** true · **worktree:** true · **skills:** react, forms, convex, tests

### CMSFORM-03 — Composite widgets (group/array/collapsible/conditional) + recursive depth-6 nav · M · wave 4
- **summary:** Nesting widgets on CMSFORM-01 + the leaf widgets: `group` (object), `array` (add/remove/reorder), `collapsible` (accordion), conditional-field wrapper evaluating `condition(data,sibling)` to mount/unmount. Prove the recursive renderer handles `navItemField`/`topLevelNavItemField` depth-6 array-of-arrays (the hardest nesting) incl per-item `variant` select + localized link/image/description children. Array row identity must be stable so dotted paths don't churn the clobber guard.
- **files:** packages/cms/src/editor/form/fields/{array,group,collapsible,conditional}.tsx, apps/admin/src/components/ui/accordion.tsx
- **depends_on:** CMSFORM-01, CMSFORM-02
- **acceptance:** test renders a depth-6 nav tree, edits a leaf at the deepest level, asserts the value lands at the correct dotted path with no sibling clobber; array add/remove/reorder preserves row identity + localized buckets; conditional field mounts/unmounts on a sibling value change; typecheck + biome pass.
- **parallel_safe:** true · **worktree:** true · **skills:** react, forms, tests

### CMSFORM-04 — Blocks field widget (block picker + recursive field render) · M · wave 5
- **summary:** `blocks` widget: block-type picker driven by `BLOCK_TYPES`/`allBlocks`, add/remove/reorder of block instances, recursive render of each block's descriptor fields through the CMSFORM-01 registry (incl the nested `columns` block embedding every other block). Graceful degradation: an unknown `blockType` falls through to a no-op row.
- **files:** packages/cms/src/editor/form/fields/blocks.tsx, packages/cms/src/blocks/registry.ts
- **depends_on:** CMSFORM-01, CMSFORM-03, CMSDESC-04
- **acceptance:** test adds each of the 9 block types, edits a nested field inside a `columns` block, round-trips through the `_payload` blob; unknown block type renders a no-op row without throwing; adding a block type forces a compile error until wired; typecheck + biome pass.
- **parallel_safe:** true · **worktree:** true · **skills:** react, forms, tests

### CMSFORM-05 — 2s autosave without keystroke clobber + draft-skips-required-validation · M · wave 7
- **summary:** Rebuild the autosave orchestration (today across `editor/form-payload.ts` + `editor/actions.ts`). A 2s-interval autosave serializes the `_payload` blob, strips keys not declared on the collection descriptor (the `{tenant:'forge'}`-injection guard via `pickByFieldNames`), and round-trips through a Convex draft mutation. Carry verbatim: (1) draft save skips required-field validation; (2) autosave NEVER triggers revalidation, and the server `initialState` refresh never clobbers in-flight keystrokes. Validation full on publish, skipped on draft.
- **files:** packages/cms/src/editor/form-payload.ts, packages/cms/src/editor/form/autosave.ts, apps/admin/src/components/cms/draft-publish-toolbar.tsx
- **depends_on:** CMSFORM-01, CONVEXCORE-07 *(↳ draft write target = tenantMutation)*
- **acceptance:** concurrent-typing test: a 2s autosave fires mid-edit + the in-flight field value survives; draft save with an empty required field succeeds, publish of the same doc fails validation; `pickByFieldNames` drops an injected non-field key; autosave path performs zero revalidation calls; typecheck + biome pass.
- **parallel_safe:** true · **worktree:** true · **skills:** react, convex, forms, tests

---

## Track CMSDATA — CMS data layer on Convex

### CMSDATA-01 — Drafts/versions/restore data model + mutations · M · wave 7
- **summary:** Convex-native drafts + version-history + restore replacing Payload's `_status`/version tables + `payload.restoreVersion`. Per content collection: published/draft status, a `_versions` companion table written on each save, a `latestVersionId` pointer, a version-list query, a restore mutation re-materializing a prior version as the current draft. Explicit create-then-version semantics (one version row per logical save). Draft writes skip required validation server-side (paired with CMSFORM-05). **Tables added via the `tables/*` module convention (ordering-risk #4), not by editing schema.ts directly.**
- **files:** packages/convex/convex/cms/{versions,documents}.ts, packages/convex/convex/tables/cms-versions.ts, packages/cms/src/editor/ui/editor-versions-page.tsx
- **depends_on:** CMSDESC-02, CONVEXCORE-07, SPIKE-01 *(↳ SPIKE-01 = feasibility kill-gate before the first heavy CMS-on-Convex commitment)*
- **acceptance:** convex-test: save creates exactly one version row + advances latestVersionId; restore re-materializes a prior version as current draft; version-list query returns ordered tenant-scoped history; draft save persists with required empty, publish enforces; typecheck passes.
- **parallel_safe:** true · **worktree:** true · **skills:** convex, tests

### CMSDATA-02 — Localization: per-field localized buckets + fallback chain + per-tenant narrowing · M · wave 7
- **summary:** Rebuild localization from Payload's `localization` config: per-field localized value buckets keyed by locale for the 35 `localized:true` fields, the request→shop→platform fallback chain (default en-US, fallback:true), per-tenant `filterAvailableLocales` narrowing. Reuse `editor/ui/locale-switcher.tsx` + `locale-label.ts`. Reads reassemble with fallback; writes target only the active locale's bucket (editing German never writes English). Tenant identity from the Phase-0 unified shops row.
- **files:** packages/convex/convex/cms/localization.ts, packages/cms/src/config/locales.ts, packages/cms/src/editor/ui/{locale-switcher.tsx,locale-label.ts}
- **depends_on:** CMSDESC-01, CONVEXCORE-04, CONVEXCORE-07
- **acceptance:** convex-test: a localized read falls back request→shop→platform when the requested bucket is empty; writing locale B leaves locale A untouched; `filterAvailableLocales` narrows to a tenant's locales; typecheck + biome pass.
- **parallel_safe:** true · **worktree:** true · **skills:** convex, i18n, tests

### CMSDATA-10 — _i18n shred-on-write / reassemble-on-read + 1 MiB doc-cap guardrail · M · wave 8
- **summary:** *(ADDED — critic missing #4; a platform limit independent of Payload.)* Implement the Convex 1 MiB per-document cap handling for a maximally-localized pages/richtext doc: shred large localized richtext/blocks into `<coll>_i18n` side rows keyed `(parentId, fieldPath, locale)` under 1 MiB, small scalars inline, reassemble on read via `by_parent_field`. Reject at schema-gen any collection whose worst-case pre-shred mutation argument would exceed Convex's per-call arg-size limit. This is the shred/reassemble contract HARNESS-10 + PIPELINE-02 consume.
- **files:** packages/convex/convex/cms/i18n-shred.ts, packages/convex/convex/tables/cms-i18n.ts, packages/cms/src/config/locales.ts
- **depends_on:** CMSDATA-02, CONVEXCORE-03, CMSDESC-02
- **acceptance:** a 1 MiB max-locale richtext doc shreds into `_i18n` side rows each < 1 MiB and reassembles byte-identical; a collection whose pre-shred arg would exceed the per-call limit is rejected at schema-gen with a typed error; no where/sort on a shredded field compiles; typecheck passes.
- **parallel_safe:** true · **worktree:** true · **skills:** convex, i18n, limits, tests

### CMSDATA-03 — Access enforcement: 13 pure predicates + wire into tenant/admin wrappers · M · wave 7
- **summary:** *(SPLIT — predicate half.)* Port the pure predicates in `packages/cms/src/access/*` (isAdmin, isTenantMember, publicRead, publishedOrAuthRead, tenantScopedRead/Write, adminOnly, tenant-id-of) — Payload-agnostic, they survive — and wire them into tenant/admin query+mutation wrappers, layered over the Phase-2 RLS deny-default.
- **files:** packages/convex/convex/cms/access.ts, packages/cms/src/access/
- **depends_on:** CONVEXCORE-07, CONVEXCORE-08
- **acceptance:** the 13 predicates have parity unit tests; a non-member tenant-scoped read/write is denied; predicates wired into the tenant/admin wrappers over deny-default; typecheck passes.
- **parallel_safe:** true · **worktree:** true · **skills:** convex, access-control, tests

### CMSDATA-04 — Shops secret reject/strip + sensitiveShopRead + overrideAccess + secret-exposure tests · M · wave 8
- **summary:** *(SPLIT — secret half; critic flags this as easy to get subtly wrong, so it is isolated.)* Reproduce the shops secret handling from `collections/shops/secrets.ts`: reject writes to `commerceProvider.authentication.token` + `customers.clientSecret` from non-admins, strip them on read, with the server-only `sensitiveShopRead` trusted opt-out (never settable from the browser). Reproduce `overrideAccess` semantics (enforce-in-editor / bypass-in-sync). Gate with explicit secret-exposure tests.
- **files:** packages/convex/convex/cms/secrets.ts, packages/cms/src/collections/shops/secrets.ts
- **depends_on:** CMSDATA-03, CONVEXCORE-04
- **acceptance:** secret-exposure test: a non-admin read of a shop NEVER returns token/clientSecret on the wire; a non-admin write to those paths is rejected/no-ops; `sensitiveShopRead` opt-out returns secrets only from a server-trusted context, never a client arg; cross-tenant read denied; typecheck passes.
- **parallel_safe:** true · **worktree:** true · **skills:** convex, access-control, tests

### CMSDATA-11 — Admin-list bounded pagination + count/totalDocs + BoundedScanExceededError · M · wave 7
- **summary:** *(ADDED — critic missing #5; native editor lists still need bounded scans + counts even without the adapter.)* For the Convex-native CMS editor lists: a scan-budget guardrail throwing a typed `BoundedScanExceededError` before the 32k-doc/16 MiB ceiling, cursor/offset pagination (Convex has no skip/offset — derive page-N cursor, cap max addressable page with a typed error past it), and `@get-convex/aggregate` `count`/`totalDocs`. Tenant-scoped + page-bounded by the unified tenant identity.
- **files:** packages/convex/convex/cms/list.ts, packages/convex/convex/lib/scan-budget.ts, packages/cms/src/editor/ui/editor-list-page.tsx
- **depends_on:** CONVEXCORE-04, CONVEXCORE-05, CONVEXCORE-07, CMSDESC-02
- **acceptance:** a tenant list past the ceiling throws `BoundedScanExceededError` (not silent truncation); pagination returns a stable page-N cursor + refuses past the cap with a typed error; `count`/`totalDocs` via aggregate match the seeded volume; typecheck passes.
- **parallel_safe:** true · **worktree:** true · **skills:** convex, limits, tests

### CMSDATA-05 — 7 editor server actions on Convex (behind the action interface) · M · wave 9
- **summary:** *(SPLIT from old CMSDATA-04 — the 7 mutations.)* Rebuild the 7 server actions from `editor/actions.ts` (saveDraft/publish/create/delete/bulkDelete/bulkPublish/restoreVersion) as Convex-backed actions, access-enforced via CMSDATA-03/04 guards on each (`overrideAccess:false`). Auth ctx (`getAuthedPayloadCtx` user/tenant resolution) comes from CONVEXCORE-14 + the admin shopId resolver CONVEXCORE-16.
- **files:** packages/cms/src/editor/actions.ts, packages/convex/convex/cms/actions.ts
- **depends_on:** CMSFORM-05, CMSDATA-01, CMSDATA-02, CMSDATA-03, CMSDATA-04, CONVEXCORE-14, CONVEXCORE-16
- **acceptance:** all 7 actions covered by tests (create→draft, autosave→draft, publish, delete, bulkDelete, bulkPublish, restoreVersion) green; access enforced via the guards (overrideAccess:false); saveDraft fires zero revalidation; no `@payloadcms` import in the action modules (grep clean); cms typecheck green.
- **parallel_safe:** true · **worktree:** true · **skills:** convex, payload-removal, tests

### CMSDATA-06 — EditorRuntime DI rewire off @payloadcms/ui buildFormState · M · wave 10
- **summary:** *(SPLIT from old CMSDATA-04 — the DI swap; this is the chokepoint.)* Rewire the `EditorRuntime` DI (`editor/runtime.ts`, `apps/admin/src/lib/editor-runtime.tsx`, `get-cms-shell-props.ts`, `cms-server-function.ts`) off `@payloadcms/ui` `buildFormState`/`payload.find/create/update/restoreVersion` onto the CMSFORM-01 form-state core + the CMSDATA-05 mutations.
- **files:** packages/cms/src/editor/runtime.ts, apps/admin/src/lib/{editor-runtime.tsx,get-cms-shell-props.ts,cms-server-function.ts}
- **depends_on:** CMSDATA-05, CMSFORM-01
- **acceptance:** EditorRuntime resolves form state from the native core + actions from CMSDATA-05; no `@payloadcms/ui` import in the runtime/DI modules (grep clean); admin typecheck green; a smoke test renders an editor through the rewired runtime.
- **parallel_safe:** false · **worktree:** true · **skills:** convex, react, payload-removal, tests

### CMSDATA-07 — Editor shell page rebind (list/edit/new/versions + editor-fields) · M · wave 11
- **summary:** *(SPLIT from old CMSDATA-04 — the shell rebind.)* Rebind the editor shell pages (`editor/ui/editor-{list,edit,new,versions}-page.tsx`, `editor-fields.tsx`) to the native renderer + the CMSDATA-06 runtime + the CMSDATA-11 bounded list.
- **files:** packages/cms/src/editor/ui/editor-{list,edit,new,versions}-page.tsx, packages/cms/src/editor/ui/editor-fields.tsx
- **depends_on:** CMSDATA-06, CMSFORM-02, CMSFORM-03, CMSFORM-04, CMSDATA-11
- **acceptance:** all 4 shell pages render through the native renderer/runtime; list page uses the bounded pagination; no `@payloadcms` import in the shell-binding modules (grep clean); admin boots + renders an editor without Payload; typecheck green.
- **parallel_safe:** false · **worktree:** true · **skills:** react, convex, payload-removal, tests

### CMSDATA-08 — Publish-action → bridge tag-derivation feed (replaces revalidateForManifest) · M · wave 10
- **summary:** *(SPLIT from old CMSDATA-04 — the publish→bridge feed.)* Replace `revalidateForManifest`: a publish action fires a Convex publish mutation that derives tags (BRIDGE-03) and feeds the Phase-4 revalidation bridge (BRIDGE-05); autosave/draft never revalidates.
- **files:** packages/cms/src/editor/revalidate.ts, packages/convex/convex/cms/on-publish-feed.ts
- **depends_on:** CMSDATA-05, BRIDGE-03, BRIDGE-05
- **acceptance:** publish fires the bridge with derived tags; saveDraft fires zero revalidation (test); the feed path imports BRIDGE-03 tag derivation, not `Shop.findByDomain`; typecheck green.
- **parallel_safe:** true · **worktree:** false · **skills:** convex, react, tests

### CMSDATA-09 — Live preview + theme postMessage bridge rebuild · M · wave 12
- **summary:** *(ADDED — critic missing #3; cms-decision §1.2/§2; the active `.specs/2026-05-30-admin-theme-editor/` depends on this.)* Rebuild live preview: tenant+locale preview URL, `draftMode()` reads, the origin-verified theme `postMessage` `theme-preview-ready` handshake, and the admin theme-editor live preview surface (spec §2.2 Lane-2, single-editor — STATIC, no Convex subscription). Reads drafts through the rebuilt editor data path.
- **files:** apps/admin/src/components/cms/live-preview.tsx, packages/cms/src/editor/preview/, apps/storefront/src/app/[domain]/[locale]/(preview)/
- **depends_on:** CMSDATA-07
- **acceptance:** a tenant+locale preview URL renders draft content via draftMode(); the theme postMessage handshake is origin-verified (rejects a foreign origin); a theme edit updates the preview without a full reload; the preview path opens no public Convex subscription (single-editor, static); typecheck passes.
- **parallel_safe:** true · **worktree:** true · **skills:** react, next, convex

### CMSDATA-12 — Transactional email path audit + Resend rebuild/removal · S · wave 10
- **summary:** *(ADDED — critic missing #8 sub.)* `@payloadcms/email-resend` is dropped with Payload. Audit every flow that sends mail (auth, editor notifications); rebuild any live flow on a direct Resend client or remove it deliberately. Documented decision per flow.
- **files:** apps/admin/src/lib/email/, .specs/2026-05-30-convex-migration/email-audit.md
- **depends_on:** CMSDATA-05
- **acceptance:** every mail-sending flow enumerated + classified rebuild/remove with a documented decision; any kept flow sends via a non-Payload Resend client (test or manual verification); no `@payloadcms/email-resend` import remains; typecheck green.
- **parallel_safe:** true · **worktree:** false · **skills:** convex, email

---

## Track CMSMEDIA

### CMSMEDIA-01 — Media storage: upload + mime allowlist + S3/R2 client · M · wave 9
- **summary:** *(SPLIT — derivatives→CMSMEDIA-02, CDN/consumption→CMSMEDIA-03.)* Media STORAGE layer: the Convex file-storage upload mutation CMSFORM-06 calls (+ `apps/admin/src/lib/cms-actions/media-upload.ts` rebind), mime allowlist enforcement (image/*, video/mp4, application/pdf), S3/R2 bucket client wiring, original-asset persistence, media docs tenant-scoped (CMSDATA-04 guards). Preserve the emitted `Media` shape's storage fields. NOT the derivative sizes or CDN URLs.
- **files:** packages/convex/convex/cms/media.ts, packages/convex/convex/tables/cms-media.ts, packages/cms/src/collections/media.ts, apps/admin/src/lib/cms-actions/media-upload.ts
- **depends_on:** CMSDESC-02, CMSDATA-04, CONVEXCORE-03
- **acceptance:** upload persists the original to S3/R2 + a tenant-scoped media doc; a disallowed mime (text/html) rejected, image/mp4/pdf accepted; emitted `Media` storage fields match the frozen read-contract type; typecheck passes.
- **parallel_safe:** true · **worktree:** false · **skills:** convex, s3, tests

### CMSMEDIA-02 — Media derivatives: sharp 4 named sizes + focal point · M · wave 10
- **summary:** Generate the 4 named image sizes (thumbnail 320×240 / card 768×576 / feature 1280×720 / hero 1920×1080) + focal-point crop via `sharp`, on upload (or a scheduled Convex action), keyed off the CMSMEDIA-01 originals. Persist derivative metadata (size variants + focal coords) per asset; regeneration idempotent.
- **files:** packages/convex/convex/cms/media-derivatives.ts, packages/cms/src/media/sizes.ts
- **depends_on:** CMSMEDIA-01
- **acceptance:** uploading an asset produces all 4 named sizes + focal crop; derivative metadata persisted + queryable per asset; regeneration is idempotent (re-run = no new rows).
- **parallel_safe:** true · **worktree:** false · **skills:** convex, media, sharp

### CMSMEDIA-03 — Media CDN URLs + storefront image consumption · M · wave 11
- **summary:** Generate CDN (S3/R2) URLs for originals + the 4 derivatives and migrate storefront image consumption (Next/Image loaders + the media shapes inside the frozen 38-getter contract) to the new URL scheme. Replace Payload media URL shapes with the Convex-native equivalents behind unchanged getter signatures.
- **files:** apps/storefront/src/ (image consumption), packages/cms/src/media/urls.ts
- **depends_on:** CMSMEDIA-02
- **acceptance:** storefront renders images from CDN URLs for originals + all 4 sizes; getter media shapes match the SFREAD-01 frozen contract (null-on-missing preserved); no Payload media URL helper remains (grep clean).
- **parallel_safe:** true · **worktree:** false · **skills:** react, media, convex

---

## Track CMSRICH

### CMSRICH-01 — Rich-text storage + editor widget (ProseMirror/Tiptap via prosemirror-sync) · M · wave 8
- **summary:** Replace Lexical authoring with a Convex-native ProseMirror stack. Integrate the `prosemirror-sync` Convex component for collaborative rich-text storage (ProseMirror/Tiptap JSON), build the Tiptap field widget registered in the CMSFORM-01 registry, bound to form state + the CMSDATA-02 localized buckets. Drives the 4 richText fields + the `rich-text` block incl its collapsible/collapsedByDefault/collapseLabel conditional siblings. Drop `@payloadcms/richtext-lexical` from the config. **prosemirror tables added via the tables/* module convention.**
- **files:** packages/convex/convex/cms/prosemirror.ts, packages/convex/convex/tables/cms-prosemirror.ts, packages/cms/src/editor/form/fields/rich-text.tsx, packages/cms/src/blocks/rich-text.ts, packages/cms/src/config/index.ts
- **depends_on:** CMSFORM-01, CMSDATA-02, CONVEXCORE-03
- **acceptance:** widget edits + persists ProseMirror JSON through the localized bucket; collapsible conditional siblings mount on the checkbox; no `@payloadcms/richtext-lexical`/`lexicalEditor` import in CMS source (grep clean); typecheck + biome pass.
- **parallel_safe:** true · **worktree:** true · **skills:** convex, prosemirror, tiptap, react, tests

### CMSRICH-02 — Storefront ProseMirror renderer rewrite · M · wave 9
- **summary:** *(SPLIT — the conversion codec is CMSRICH-04.)* Rewrite the storefront rich-text RENDERER for ProseMirror JSON. The local renderer `apps/storefront/src/blocks/rich-text-renderer.tsx` (+ rich-text.tsx, registry.tsx, types.ts) parses Lexical node types today; rewrite it to render ProseMirror/Tiptap JSON. Preserve the storefront's own `Link` component + locale-prefixed URL scheme and the no-heavy-dep posture.
- **files:** apps/storefront/src/blocks/{rich-text-renderer,rich-text,registry,types}.tsx
- **depends_on:** CMSRICH-01
- **acceptance:** updated `rich-text-renderer.test.tsx` renders ProseMirror JSON to the same DOM the Lexical fixtures produced (golden parity); marks/headings/lists/locale-prefixed links render; typecheck passes.
- **parallel_safe:** true · **worktree:** false · **skills:** react, prosemirror, tests

### CMSRICH-04 — Lexical→ProseMirror content conversion codec (lossless) · M · wave 9
- **summary:** Pure, well-tested Lexical-JSON→ProseMirror-JSON converter covering every node/mark type in the corpus: headings, lists, marks, locale-prefixed links, and the `rich-text` block siblings. Consumed by the ETL (PIPELINE-02) and the fidelity gate (CMSRICH-03). Unconvertible node types **RAISE, never drop**.
- **files:** packages/cms/src/editor/richtext/lexical-to-prosemirror.ts, packages/cms/src/editor/richtext/lexical-to-prosemirror.test.ts
- **depends_on:** CMSRICH-01
- **acceptance:** unit tests cover every node/mark type present in the corpus; round-trip on fixtures is lossless; an unknown node type throws (never silently dropped); pure (no IO).
- **parallel_safe:** true · **worktree:** false · **skills:** prosemirror, lexical, content-migration, tests

### CMSRICH-03 — [FIDELITY GATE] Lexical→ProseMirror full-corpus round-trip fidelity gate · M · wave 11
- **summary:** Prove the Lexical→ProseMirror codec (CMSRICH-04) + renderer (CMSRICH-02) + ETL rich-text shred (PIPELINE-02) lose **ZERO** semantic content across the ENTIRE existing richtext corpus, before any CMS content cuts over. Convert every richtext doc (the 4 richText fields + the `rich-text` block) across all tenants, render both Lexical-source and ProseMirror-target through the storefront renderers, and diff the rendered DOM. Any non-empty semantic diff is a hard fail. Quarantine + report unconvertible node types; never silently drop. Re-runnable; the green report is a hard predecessor of every CMS content cutover.
- **files:** scripts/richtext-fidelity-check.ts, apps/storefront/src/blocks/rich-text-renderer.tsx, packages/cms/src/editor/form/fields/rich-text.tsx
- **depends_on:** CMSRICH-02, CMSRICH-04, PIPELINE-02
- **acceptance:** every richtext doc in the corpus (4 fields + rich-text block, all tenants) round-trips with zero semantic diff in rendered storefront output; any unconvertible node type is quarantined + reported, not silently dropped; the fidelity report is re-runnable + green and is a hard depends_on of CUTOVER-04/05/06.
- **parallel_safe:** true · **worktree:** false · **skills:** convex, content-migration, tests

---

## Track CMSGATE — HARD PARITY GATES

### CMSGATE-01 — [PARITY GATE] Form engine proven end-to-end on header (depth-6 nav) · M · wave 12
- **summary:** Parity gate #1 (hardest collection A). Wire the full Convex-native stack for the `header` tenant-singleton end-to-end: descriptor-driven depth-6 nav render, per-item variant select, localized link/image/description children, 2s autosave without clobber, draft/publish/version-restore, per-tenant locale narrowing + fallback, access enforcement — all through the rebuilt editor shell with zero `@payloadcms` imports. **HARD GATE: no other collection cuts over until both parity gates pass.**
- **files:** packages/cms/src/collections/_globals/, packages/cms/src/editor/manifests/header.ts
- **depends_on:** CMSFORM-03, CMSDATA-01, CMSDATA-02, CMSDATA-03, CMSDATA-05, CMSDATA-06, CMSDATA-07, CMSDATA-08, CMSDESC-02, CMSDATA-11
- **acceptance:** e2e: create→edit a depth-6 nav item under a tenant→2s autosave (no clobber)→publish→restore a prior version, all green; editing a localized child in locale B leaves locale A intact; a non-member is denied; the header authoring path imports zero `@payloadcms/*` (grep clean); admin boots + renders the header editor without Payload.
- **parallel_safe:** true · **worktree:** true · **skills:** convex, react, tests

### CMSGATE-02 — [PARITY GATE] Form engine proven end-to-end on pages (blocks) · M · wave 12
- **summary:** Parity gate #2 (hardest collection B). Wire the full stack for `pages` end-to-end: blocks widget rendering all 9 block types (incl nested `columns` + the `rich-text` block on ProseMirror), media uploads producing 4 sizes + focal, localized fields + fallback, 2s autosave without clobber, draft/publish/version-restore, access enforcement — zero `@payloadcms` imports. Verifies the upload widget against the real CMSMEDIA-01/02/03 pipeline + the rich-text widget against CMSRICH-01/02. **HARD GATE alongside CMSGATE-01.**
- **files:** packages/cms/src/collections/pages.ts, packages/cms/src/editor/manifests/pages.ts
- **depends_on:** CMSFORM-04, CMSFORM-06, CMSRICH-02, CMSMEDIA-03, CMSDATA-01, CMSDATA-05, CMSDATA-06, CMSDATA-07, CMSDATA-08, CMSDESC-02
- **acceptance:** e2e: create a page→add each of the 9 blocks incl a columns-nested rich-text block→upload an image (4 sizes)→autosave→publish→restore, all green; a draft page with an empty required block field autosaves, publish enforces validation; the pages authoring path imports zero `@payloadcms/*`; the emitted Page.blocks shape matches the frozen read contract.
- **parallel_safe:** true · **worktree:** true · **skills:** convex, react, sharp, prosemirror, tests

---

## Track SFREAD — storefront reads, reactivity & db re-home

### SFREAD-01 — Freeze the 11 CMS getter read contract (typed boundary + golden tests) · M · wave 1
- **summary:** Lock the storefront CMS read contract as a typed boundary before any read re-point. Snapshot the exact return types + runtime shapes of the 11 getters (getPage/getPages/getArticle/getArticles/getHeader/getFooter/getBusinessData/getProductMetadata/getCollectionMetadata/resolveLink/resolveTenantId) against payload-types.ts shapes, the depth-2 populate, locale-map normalization, and the null-on-missing contract (null must NOT 404 the host page). Golden fixture tests + a compile-time `.d.ts` snapshot of the getter signatures. **Committed inventory of the 38 call sites across 33 files** *(weak-acceptance fix: reconciled to cms-decision §1.3 / spec — 38/33, NOT 33/16; CUTOVER-04/05/06 verify against this same count)*.
- **files:** packages/cms/src/api/{index,get-page,get-header,resolve-tenant-id}.ts, apps/storefront/src/api/{_cms,_normalize-payload}.ts
- **depends_on:** —
- **acceptance:** golden tests assert each of the 11 getters returns the exact shape for the canonical seed AND returns null (never throws) on missing; cms + storefront test projects green; a type-level snapshot fails if any getter signature/return type changes (`pnpm typecheck` enforces); committed inventory lists all **38 call sites across 33 files** + `grep -c` matches.
- **parallel_safe:** true · **worktree:** false · **skills:** tests, cms, typescript

### SFREAD-02 — Freeze the packages/db service-seam contract (6 services) as golden tests · M · wave 1
- **summary:** Lock the packages/db export surface (~183 importers). Characterize the 6 services (Shop/Review/FeatureFlag/User/Session/Identity), the generic Service base contract (NotFoundError-on-empty-single; findAll swallow→[]), the {shop,locale} convention, OnlineShop/ShopBase/ReviewBase types, and the credential-masking output of `docToOnlineShop` (token + clientSecret stripped). `.d.ts` signature snapshot of the barrel + golden tests for masking + NotFoundError. Characterization only.
- **files:** packages/db/src/index.ts, packages/db/src/services/{service,shop,index}.ts, packages/db/src/lib/doc-to-shape.ts
- **depends_on:** —
- **acceptance:** golden tests pin NotFoundError on missing single-doc, findAll→[] on failure, docToOnlineShop masks the two secrets; db test project green; committed `.d.ts` barrel snapshot, typecheck fails if any of the 6 service signatures or {shop,locale} convention changes; every public service method covered by a frozen-signature assertion.
- **parallel_safe:** true · **worktree:** false · **skills:** tests, convex, typescript

### SFREAD-03 — Re-home packages/db base: lazy ConvexHttpClient + Service base preserving NotFoundError · M · wave 7
- **summary:** Replace the Mongo plumbing under the unchanged seam. Rewrite `db.ts` top-level `mongoose.connect` into a lazy server-only `ConvexHttpClient(CONVEX_URL)`; flatten the Mongoose `Document` intersection in `BaseDocument` to `{ id; createdAt; updatedAt }` with `_id`→id and `_creationTime`→createdAt. Rewrite the generic Service base to call deployed convex/ functions while preserving every signature + the NotFoundError-on-empty-single / findAll-swallow contract. Keep `import 'server-only'`. Add the CI/lint gate forbidding > 1 ConvexHttpClient.mutation per logical write.
- **files:** packages/db/src/{db,index}.ts, packages/db/src/services/service.ts
- **depends_on:** SFREAD-02, CONVEXCORE-07, CONVEXCORE-08, CONVEXCORE-01, SPIKE-01 *(↳ SPIKE-01 = feasibility kill-gate before re-homing packages/db onto Convex)*
- **acceptance:** db.ts no longer imports mongoose (grep clean); Service base preserves NotFoundError + findAll-[] (SFREAD-02 golden tests pass unchanged); lint/CI gate rejects > 1 mutation per logical write (negative test fails CI); `MONGODB_URI= pnpm build:packages` succeeds for db with the var blank.
- **parallel_safe:** false · **worktree:** true · **skills:** convex, typescript, payload-removal

### SFREAD-05 — Convex-back Shop/Review/FeatureFlag read functions + read internals + masking/taint · M · wave 8
- **summary:** *(SPLIT — read half of old SFREAD-05.)* Deploy read functions `shops.byDomain` (shopDomains by_domain → db.get; `$or` becomes two indexed lookups merged), `shops.byId`, `shops.byCollaborator`, `shops.findAll`, `shops.byDomainWithCredentials` (systemQuery hot path), `reviews.byShop/findAll` (resolve the dead `tenant` filter intent), `featureFlags.byKey/findAll`. Rewrite the read internals of `shop/review/feature-flag.ts` to call them, projecting `legacyId`→shop.id (never surface Convex `_id`). Move credential masking to the shopCredentials boundary; re-apply `experimental_taintUniqueValue` after deserialization.
- **files:** packages/db/src/services/{shop,review,feature-flag}.ts, packages/db/src/lib/doc-to-shape.ts, packages/convex/convex/db/{shops,reviews,feature-flags}.ts
- **depends_on:** SFREAD-03, SFREAD-02, CONVEXCORE-04, CONVEXCORE-05
- **acceptance:** SFREAD-02 golden tests pass unchanged (masking, NotFoundError, shapes byte-identical); integration: byDomain resolves a primary domain + an alternativeDomain to the same shop; shop.id == legacyId, Convex `_id` never surfaced; secret-exposure: public byDomain payload contains no token/clientSecret + tainted credential read re-taints after deserialization.
- **parallel_safe:** true · **worktree:** true · **skills:** convex, typescript, tests

### SFREAD-14 — Single atomic shop write mutation + shopDomains reconciliation + uniqueness · M · wave 9
- **summary:** *(SPLIT — the write half of old SFREAD-05; its own correctness unit.)* Make every shop write a single atomic Convex mutation (shops + shopCredentials + shopDomains delete-diff + collaborator join tables) — forbidding multiple `ConvexHttpClient.mutation` per logical write — enforcing `shopDomains.domain` uniqueness with `.unique()` wrapped to degrade to a logged first-match, and reconciling stale shopDomains rows on domain-set shrink.
- **files:** packages/db/src/services/shop.ts, packages/convex/convex/db/shop-write.ts
- **depends_on:** SFREAD-05, CONVEXCORE-04, CONVEXCORE-07
- **acceptance:** a shop write performs exactly one Convex mutation (asserted); domain-set shrink reconciles shopDomains (delete-diff) within the same mutation; `.unique()` degrades to a logged first-match on a duplicate domain instead of throwing site-wide; signature unchanged; tests green.
- **parallel_safe:** true · **worktree:** true · **skills:** convex, typescript, tests

### SFREAD-06 — Convex-back User/Session/Identity services + Auth.js adapter shapes · M · wave 8
- **summary:** Re-point the auth-backing trio behind unchanged signatures using systemQuery/systemMutation (platform-global). Rewrite `user/session/identity.ts` to deployed convex/ functions for user by_email, session by_token CRUD, identity by_provider_identity with uniqueness enforced in the mutation. Rework the Auth.js adapter Mongoose-isms in `apps/admin/src/utils/auth.adapter.ts` (.toObject()/.save()/identities.push/findOneAndUpdate upsert) into explicit Convex mutations, preserving not-found→null / infra-error→throw. Keep SessionBase/UserBase/IdentityBase verbatim.
- **files:** packages/db/src/services/{user,session,identity}.ts, apps/admin/src/utils/auth.adapter.ts, packages/convex/convex/db/{users,sessions,identities}.ts
- **depends_on:** SFREAD-03, CONVEXCORE-05, CONVEXCORE-08, CONVEXCORE-14
- **acceptance:** auth.adapter unit tests pass with not-found→null / infra-error→throw preserved, no mongoose import; integration: identity upsert enforces (provider,identity) uniqueness (concurrent create yields one row); session create/read/delete round-trips by_token; Base type snapshots unchanged (typecheck green).
- **parallel_safe:** true · **worktree:** true · **skills:** convex, typescript, tests

### SFREAD-04 — findByDomain edge path: swap middleware loaders to Convex, keep TTL/LRU, benchmark · M · wave 9
- **summary:** Re-point the hostname→shop hot path. Swap `resolveShopSummary`/`resolveLocaleCodes` in `middleware/storefront.ts` from `Shop.findByDomain` (Mongo) to the Convex-backed Shop service; leave `shop-cache.ts` (TTL/LRU 60s/2.5s-neg/1000-max, single-flight) untouched. Confirm the middleware stays Node runtime. Wire `invalidateShop` into the revalidation path. Benchmark miss-path p50/p99 from the real middleware region vs the Convex region and gate the flip on a documented budget. *(weak-acceptance fix: budget = p50 ≤ 40ms, p99 ≤ 150ms miss-path; else co-locate / add a regional replica.)*
- **files:** apps/storefront/src/middleware/{storefront,shop-cache,storefront.test}.ts
- **depends_on:** SFREAD-05, CONVEXCORE-04
- **acceptance:** resolveShopSummary/resolveLocaleCodes resolve via Convex; grep `Shop.findByDomain` in middleware returns no Mongo-backed call; shop-cache.ts diff empty; middleware confirmed Node; cache-hit path issues zero network calls; recorded p50/p99 vs the committed budget (p50 ≤ 40ms / p99 ≤ 150ms) with a committed benchmark artifact, flip gated on it; invalidateShop invoked on domain/locale change; storefront tests green.
- **parallel_safe:** true · **worktree:** false · **skills:** convex, react, tests, perf

### SFREAD-07 — Mount thin ConvexReactClient provider as a PPR-safe leaf + CSP + zero-Convex public-bundle gate · M · wave 2
- **summary:** Mount a single `'use client'` ConvexReactClient provider in the root layout as a leaf wrapping children only, reading no request data (public `NEXT_PUBLIC_CONVEX_URL` only; never the auth token at provider root) so it does not force the layout dynamic and the PPR static shell stays prerendered. Add the Convex WSS + HTTPS origins to connect-src CSP. Add the load-bearing PPR snapshot test proving the static shell is byte-unchanged after the mount. Lane-2 infrastructure.
- **files:** apps/storefront/src/app/[domain]/[locale]/layout.tsx, apps/storefront/src/middleware
- **depends_on:** SFREAD-10, CONVEXCORE-01
- **acceptance:** provider mounted as a children-only leaf reading no request data; PPR prerender snapshot asserts the static shell unchanged vs baseline; CSP connect-src includes the Convex WSS + HTTPS origins; the SFREAD-10 zero-Convex public-bundle assertion stays green (provider is draft/auth-gated where it subscribes).
- **parallel_safe:** true · **worktree:** false · **skills:** react, next, convex

### SFREAD-08 — Lane-2 authenticated island end-to-end (account/orders) with snapshot-then-live + kill switch · M · wave 9
- **summary:** First reactive island. In the dynamic PPR hole (an RSC segment touching cookies()/auth) call `preloadQuery(api.orders, args, { headers: { 'Convex-Auth': token } })` and pass the serializable `Preloaded<T>` to a `'use client'` child calling `usePreloadedQuery` (hydrate from snapshot, then subscribe). Snapshot-when-socket-down is the explicit degraded contract — no infinite spinner. Add a per-surface kill switch downgrading to the preloaded snapshot. Plumb the CONVEXCORE-14 NextAuth-JWT auth fetcher; on auth failure render the read-only snapshot.
- **files:** apps/storefront/src/app/[domain]/[locale]/account, apps/storefront/src/middleware
- **depends_on:** SFREAD-07, SFREAD-06, CONVEXCORE-14
- **acceptance:** preloadQuery runs only inside the dynamic PPR hole (not in any 'use cache' fn); island hydrates from snapshot then goes live; socket-down test renders the snapshot with no infinite spinner; kill switch downgrades to the snapshot; auth-failure renders the read-only snapshot (not blank); token refresh round-trips.
- **parallel_safe:** true · **worktree:** false · **skills:** react, next, convex, tests

### SFREAD-09 — Lane-1/Lane-2 PPR coexistence gate on a public route (PDP) — prerender snapshot test · M · wave 3
- **summary:** Prove static cached SEO + a reactive island coexist on a public route. On the PDP keep the static cached SEO body (real crawlable content + cached availability snapshot) and add exactly one Suspense-wrapped, interaction/auth-gated island upgrading to live via `useQuery` only behind interaction, disconnecting on tab-hidden. Hard gate: a per-route PPR prerender snapshot test asserting (a) SEO HTML in the static shell, (b) island as a dynamic Suspense hole, (c) no preloadQuery during prerender.
- **files:** apps/storefront/src/app/[domain]/[locale]/products/[handle]/{page.tsx,page.test.ts}
- **depends_on:** SFREAD-07, SFREAD-10
- **acceptance:** the prerender snapshot test asserts SEO HTML in the static shell, island as a dynamic Suspense hole, zero preloadQuery during prerender; anonymous/crawler render opens no WebSocket, island subscribes only on interaction + disconnects on tab-hidden; storefront tests green; cacheComponents build succeeds with no poisoning error.
- **parallel_safe:** true · **worktree:** false · **skills:** react, next, convex, tests

### SFREAD-10 — Surface classifier map + zero-public-subscription enforcement (+ public-bundle scan) · S · wave 1
- **summary:** Apply the §2.1 decision rule to every storefront surface + record the map in the spec. Classify cart/inventory + single-editor theme preview as STATIC (Shopify system of record; live number advisory only). Add the CI assertion that the public (non-draft) storefront bundle ships zero Convex client/WebSocket *(folds BRIDGE-11: `scripts/assert-no-convex-public-bundle.ts` build-output scan, passes trivially until the SFREAD-07 provider mount makes it load-bearing)*, gate the preview/reactive path strictly behind draftMode()/auth + code-splitting.
- **files:** .specs/2026-05-30-convex-migration/spec.md, apps/storefront/src/app, scripts/assert-no-convex-public-bundle.ts, .github/workflows/ci.yml
- **depends_on:** —
- **acceptance:** committed surface map enumerates each route segment as Lane-1 static-SEO or Lane-2 reactive-island with the 3-clause justification; the bundle scan script fails on a planted `convex`/`ConvexReactClient`/Convex-WSS reference + passes on the current build, wired into CI after the storefront build; cart/inventory + theme-preview recorded as static / Shopify-system-of-record.
- **parallel_safe:** true · **worktree:** false · **skills:** react, ci, next

### SFREAD-11 — Prerender / use-cache audit for the new Convex reads (cacheComponents clock guards) · M · wave 12
- **summary:** Audit every new ConvexHttpClient read added to RSC (the re-pointed packages/db reads + the CMS dual-read loader) and wrap each in the correct `'use cache'`/`connection()` boundary so non-reactive cached-static (Lane-1) reads use fetchQuery/cached loaders and never preloadQuery. Validate cacheComponents prerender against existing snapshot tests (the team is actively fighting prerender-clock guards — bee469a/1b5df45/7952ca). Resolve at root cause, not by reverting versions/disabling features.
- **files:** apps/storefront/src/api/{_loaders,_shop-loader}.ts, apps/storefront/src/app/[domain]/[locale]/layout.tsx
- **depends_on:** SFREAD-05, SFREAD-12
- **acceptance:** every new Convex RSC read sits in a correct 'use cache'/connection() boundary; no preloadQuery/no-store read inside any 'use cache' function (asserted); existing prerender snapshot tests green; cacheComponents build produces no clock-guard error; `pnpm build --filter @nordcom/commerce-storefront` succeeds with PPR enabled.
- **parallel_safe:** false · **worktree:** false · **skills:** next, react, convex, tests

### SFREAD-12 — CMS-content dual-read loader: shadow Convex-native CMS vs Payload-on-Mongo → ledger → flip · M · wave 11
- **summary:** Give CMS content the same shadow→ledger→flip safety as packages/db services, decoupled from admin-write cutover. On the storefront getter path (`api/{header,footer,page,article,metadata,info-bar}.ts` via `_cms.ts`) read BOTH the Convex-native CMS reads (Track B′) and the existing Payload-on-Mongo getters, **serve Mongo (authoritative during bake)**, log per-getter divergence to a ledger. Normalize rich-text before comparison (Mongo=Lexical, Convex=ProseMirror — compare via the conversion layer). Gate the per-getter read-flip behind a flag; SFREAD-01 is the equality oracle. *(Read-shadow only — not a second authoritative write DB; honors zero-temporary-Mongo.)*
- **files:** apps/storefront/src/api/{_cms,header,page,_normalize-payload}.ts
- **depends_on:** SFREAD-01, CMSDESC-02, CMSDATA-01, CMSRICH-02, PIPELINE-02
- **acceptance:** dual-read reads both backends, serves Mongo, writes per-getter divergence to a ledger; identical seed yields zero divergence after rich-text normalization; per-getter flip flag serves Convex while SFREAD-01 golden tests stay byte-identical (null-on-missing preserved); a planted CMS divergence is recorded (negative test); runs without admin-write cutover.
- **parallel_safe:** true · **worktree:** false · **skills:** convex, cms, tests, next

### SFREAD-13 — Build-time fan-out cap for generateStaticParams + sitemaps · M · wave 12
- **summary:** Bound Convex build-time cost (calls scale with build fan-out N tenants × M params, not traffic). Route the static-params generators (products/collections/[...slug]/blogs/[locale]) + the sitemap/robots routes through paginated/batched Convex queries or a `convex export` snapshot read, with a hard per-build call cap. Lean on ISR (dynamicParams:true) to shift cost from build burst to first-request latency. Keep the cached-tag taxonomy (tenantRootTags) intact.
- **files:** apps/storefront/src/app/[domain]/[locale]/products/[handle]/static-params.ts, apps/storefront/src/app/[domain]/[locale]/[...slug]/static-params.ts, apps/storefront/src/app/[domain]/sitemap.xml/route.ts, apps/storefront/src/app/[domain]/sitemaps/pages.xml/route.ts
- **depends_on:** SFREAD-05, PIPELINE-04
- **acceptance:** static-params + sitemap generators read via paginated/batched Convex (or export snapshot); a build asserts total Convex calls stay under the documented per-build cap; dynamicParams verified for long-tail params (first-request ISR, no unbounded build fan-out); sitemap/robots route tests green; tenantRootTags unchanged.
- **parallel_safe:** true · **worktree:** false · **skills:** next, convex, perf, tests

---

## Track BRIDGE — durable Convex→Next revalidation bridge (publish-only)

### BRIDGE-01 — Shared publish-event payload contract + dual-accept HMAC verify (Next-side) · S · wave 1
- **summary:** Runtime-agnostic module defining the Convex→Next revalidation payload contract + HMAC verification, distinct from Shopify. Export: the payload type `{ eventId; tenantId; legacyShopId; collection; tags; ts }`; a canonical serialization (stable key order); `verifyRevalidateHmac(rawBody, signature, { current, previous })` (dual-accept window); `isStaleTs(ts, windowMs)`. `node:crypto` HMAC-sha256 base64 mirroring `verifyShopifyHmac`. Import-light (no server-only, no Next cache).
- **files:** apps/storefront/src/api/{_revalidate-convex,_revalidate-convex.test}.ts
- **depends_on:** —
- **acceptance:** storefront test project covers the new file; verify returns true for `current`, true for `previous`, false for wrong secret/tampered body; isStaleTs rejects old ts + accepts in-window; contract type + canonical-serialize exported + import cleanly in a plain Node/Vitest context.
- **parallel_safe:** true · **worktree:** false · **skills:** typescript, crypto, tests

### BRIDGE-02 — Dedicated /api/revalidate/convex route — verify-HMAC-FIRST, reuse only the cache tail · M · wave 2
- **summary:** Top-level non-tenant-scoped route `app/api/revalidate/convex/route.ts` (outside `[domain]`; middleware already bypasses `/api/`, reads tenant from the signed body NOT the URL). POST: read rawBody + signature header, `verifyRevalidateHmac` FIRST — before ANY shop/tenant lookup (inverts the Shopify route). Bad/missing sig → 401 with zero DB/Convex hits. Valid: reuse ONLY the tail — `cmsCache.invalidateRaw(tags)` (or `cmsCache.invalidate.tenant` broad-sweep when tags empty) + `evictApolloClient({ shopId: legacyShopId })`. Infra/lookup failure → 503 + Retry-After; unknown body → 400; GET healthcheck → 200. Leave the Shopify route untouched.
- **files:** apps/storefront/src/app/api/revalidate/convex/{route,route.test}.ts
- **depends_on:** BRIDGE-01
- **acceptance:** an invalid HMAC returns 401 AND no shop/tenant lookup mock called (verify-before-lookup proven); a valid body invalidates the supplied tags via invalidateRaw + calls evictApolloClient with the body's shopId; empty tags triggers the tenant broad-sweep; unknown body → 400; infra failure → 503 + Retry-After; GET → 200; existing Shopify route + test remain green.
- **parallel_safe:** true · **worktree:** false · **skills:** react, next, tests

### BRIDGE-03 — Convex publish-event→tags derivation (CMS taxonomy, pure, in-Convex) · M · wave 3
- **summary:** The in-Convex analog of `parseShopifyWebhook` so tags are computed where the write happened + the bridge never calls back through `Shop.findByDomain`. Extract the pure tag descriptor (the 7 CMS entity names + params from `cmsCache`'s `defineCache` schema + `cmsTenantRootTags`) into a server-only-free `cache-descriptor.ts` both `cmsCache` and Convex import. Implement `convex/revalidate/tags.ts` mapping `{ collection, key, tenantId }` → the exact tag set the read side stamped. Unit-test across all 7 collections + the broad-sweep fallback.
- **files:** packages/cms/src/cache-descriptor.ts, packages/cms/src/cache.ts, packages/convex/convex/revalidate/{tags,tags.test}.ts
- **depends_on:** CONVEXCORE-01, CONVEXCORE-03, SFREAD-01
- **acceptance:** for each of the 7 entities derived tags equal the read-side tags (`cmsCache.tags.<entity>({tenant,key})`) against the same `computeFanout`; a broad publish yields `cmsTenantRootTags(shop)`; derivation imports no server-only module + never references `Shop.findByDomain`; tests green.
- **parallel_safe:** true · **worktree:** false · **skills:** convex, tagtree, tests

### BRIDGE-04 — Convex idempotency layer — eventId dedup, stale-ts reject, per-(tenant,collection) debounce doc · M · wave 4
- **summary:** Idempotency primitives. Tables (via the tables/* module convention, NOT editing schema.ts directly): `revalidationEvents`(by_eventId) for dedup + `pendingRevalidations`(by_tenant_collection) holding the coalesced pending tag set + scheduled-job handle. Implement `convex/revalidate/idempotency.ts`: `recordEvent(eventId)` no-op if seen; `isStale(ts, windowMs)`; `coalesce(tenantId, collection, tags)` upserting/merging into the pending doc + returning whether a notify is already scheduled. Building block for BRIDGE-05's autosave-quiet guarantee.
- **files:** packages/convex/convex/tables/revalidation.ts, packages/convex/convex/revalidate/{idempotency,idempotency.test}.ts
- **depends_on:** CONVEXCORE-03, CONVEXCORE-08
- **acceptance:** a duplicate eventId is a verified no-op; a ts older than the replay window rejected, one inside accepted; two rapid publishes for the same (tenant,collection) merge into one pending doc + schedule at most one notify; convex-test covers dedup/stale/coalesce.
- **parallel_safe:** false · **worktree:** true · **skills:** convex, tests, data-migration

### BRIDGE-05 — Publish-mutation → scheduler.runAfter(notify) wiring (publish-only, never autosave) · M · wave 8
- **summary:** Wire the Convex-native CMS publish mutation (status→`published`) to schedule delivery post-commit: `ctx.scheduler.runAfter(debounceMs, internal.revalidate.notify, { tenantId, collection, tags, eventId, ts })`, tags from BRIDGE-03, dedup/coalesce from BRIDGE-04. CRITICAL: fires ONLY on the published-status transition — the 2s autosave/draft stream schedules ZERO notify. Scheduling post-commit via `runAfter`, never inline. Replaces `revalidateForManifest`.
- **files:** packages/convex/convex/revalidate/{onPublish,onPublish.test}.ts
- **depends_on:** BRIDGE-03, BRIDGE-04, CMSDATA-01
- **acceptance:** a status→published mutation schedules exactly one `internal.revalidate.notify` after debounceMs; an autosave loop / 10+ rapid draft saves schedule ZERO notify (asserted); scheduling via scheduler.runAfter post-commit (not inline); convex-test proves publish-schedules-one + draft-schedules-none.
- **parallel_safe:** false · **worktree:** false · **skills:** convex, tests

### BRIDGE-06 — Convex notify action — tenant-URL resolution, HMAC-sign, POST, throw-on-non-2xx · M · wave 5
- **summary:** `convex/revalidate/notify.ts` as the `internal.revalidate.notify` internalAction. Resolve the per-tenant storefront URL from the unified `shops` primary-domain (custom-vs-platform handling). Sign the body using the BRIDGE-01 canonical serialization with the CURRENT secret (`REVALIDATE_CONVEX_SECRET`), POST to `/api/revalidate/convex`. THROW on ANY non-2xx (incl 503) so the retrier re-fires; on 2xx mark the event acked (clear the pending doc + advance the per-tenant cursor). convex-test + mocked fetch.
- **files:** packages/convex/convex/revalidate/{notify,notify.test}.ts
- **depends_on:** BRIDGE-01, BRIDGE-03, BRIDGE-04, CONVEXCORE-04
- **acceptance:** body signed with the current secret using the exact canonical serialization the Next verifier expects (round-trips against BRIDGE-01 verify in a cross-test); custom domain used when present else platform; non-2xx (incl 503) throws, 2xx marks acked + clears the pending doc; mocked-fetch convex-test covers 2xx-ack / non-2xx-throw / URL selection.
- **parallel_safe:** true · **worktree:** false · **skills:** convex, crypto, tests

### BRIDGE-07 — Durable delivery — @convex-dev/action-retrier + dead-letter table + alert · M · wave 6
- **summary:** Install `@convex-dev/action-retrier`, register it in `convex.config.ts`, route `notify` through it with bounded exponential backoff. On retry exhaustion write a `revalidationDeadLetters` row (eventId, tenantId, tags, last error, attempts) + emit an alert hook. Implement `convex/revalidate/delivery.ts`. Add the DLQ table via the tables/* module convention. Add the dep + lockfile entry.
- **files:** packages/convex/convex/convex.config.ts, packages/convex/convex/revalidate/delivery.ts, packages/convex/convex/tables/revalidation.ts, package.json, pnpm-lock.yaml
- **depends_on:** BRIDGE-06, CONVEXCORE-01
- **acceptance:** notify runs under action-retrier with bounded exponential backoff (config asserted); a forced-non-2xx target retries N times then writes exactly one dead-letter row + fires the alert; `@convex-dev/action-retrier` in package.json + lockfile, `pnpm install --frozen-lockfile` passes; convex-test proves retry-then-DLQ.
- **parallel_safe:** false · **worktree:** true · **skills:** convex, ci, tests

### BRIDGE-08 — Incremental reconciliation cron — replay unacked tags, rate-limited · M · wave 7
- **summary:** Low-frequency reconciliation cron (`convex/crons.ts` + `convex/revalidate/reconcile.ts`) self-healing permanently-lost events. Replays ONLY tags written-but-unacked since each tenant's last successful POST cursor (advanced by BRIDGE-06) — NOT a global full-revalidate — rate-limited to avoid an origin stampede. Tenants with a clean cursor skipped. Reuses the notify/delivery path (durable + idempotent via eventId dedup).
- **files:** packages/convex/convex/crons.ts, packages/convex/convex/revalidate/{reconcile,reconcile.test}.ts, packages/convex/convex/tables/revalidation.ts
- **depends_on:** BRIDGE-04, BRIDGE-06, BRIDGE-07
- **acceptance:** cron replays only unacked tags since the per-tenant cursor (asserted it does NOT broad-sweep every tag/tenant); a deliberately dropped event self-heals on the next pass; clean-cursor tenants skipped; replay rate-limited (throttle config asserted); convex-test covers drop→heal + clean-cursor-skip.
- **parallel_safe:** false · **worktree:** true · **skills:** convex, tests, ci

### BRIDGE-09 — Secret dual-accept rotation — env wiring on both runtimes + rotation test · S · wave 6
- **summary:** Operationalize the dual-accept rotation window. Document/wire `REVALIDATE_CONVEX_SECRET` (current) + `REVALIDATE_CONVEX_SECRET_PREVIOUS` in the Next env templates + the Convex env (current for signing). Convex signs with current; Next verifies against `{current, previous}`. Test proving a body signed with PREVIOUS still 200s during the window + 401s once previous is unset. Distinct from `SHOPIFY_WEBHOOK_SECRET`.
- **files:** .env.example, apps/storefront/.env.example, apps/storefront/src/app/api/revalidate/convex/route.test.ts
- **depends_on:** BRIDGE-01, BRIDGE-02, BRIDGE-06
- **acceptance:** both secrets documented in both Next env templates + the Convex env notes; a request signed with the previous secret returns 200 while previous is set, 401 when unset; the Convex signer reads only the current secret; secret name distinct from SHOPIFY_WEBHOOK_SECRET.
- **parallel_safe:** true · **worktree:** false · **skills:** ci, crypto, tests

### BRIDGE-10 — CSP connect-src additions for Convex origins · S · wave 2
- **summary:** Extend `apps/storefront/next.config.js` `headers()` to emit a CSP whose `connect-src` includes the Convex HTTPS + WSS origins (from `NEXT_PUBLIC_CONVEX_URL`) so the draft/preview reactive islands can open their gated WebSocket. Preserve the existing `X-Powered-By` header. Unit/snapshot assertion that connect-src contains both the https: and wss: Convex origins.
- **files:** apps/storefront/next.config.js, apps/storefront/src/utils/csp.test.ts
- **depends_on:** CONVEXCORE-01
- **acceptance:** headers() returns a CSP whose connect-src includes the Convex https: + wss: origins built from NEXT_PUBLIC_CONVEX_URL; existing X-Powered-By preserved; a test asserts the connect-src contents.
- **parallel_safe:** true · **worktree:** false · **skills:** next, ci, tests

### BRIDGE-12 — Phase-4 exit-criteria integration gate · M · wave 9
- **summary:** End-to-end integration test mapping 1:1 to the plan's Phase 4 exit criteria, exercising the full chain (Convex publish mutation → debounce/dedup → notify → action-retrier → Next route → cmsCache invalidation), the failure path, the self-heal path, and the autosave-quiet invariant. The acceptance gate for the track.
- **files:** packages/convex/convex/revalidate/__tests__/bridge.integration.test.ts
- **depends_on:** BRIDGE-02, BRIDGE-05, BRIDGE-06, BRIDGE-07, BRIDGE-08
- **acceptance:** a Convex publish invalidates the corresponding Lane-1 cached tags/HTML for the tenant; a forced non-2xx triggers retry then a dead-letter row; a dropped event self-heals via the reconciliation cron; an autosave/draft loop triggers no revalidation (zero notify, zero invalidation); all four green in CI.
- **parallel_safe:** false · **worktree:** false · **skills:** convex, tests, ci

---

## Track HARNESS — @nordcom/commerce-test-convex (build + migrate consumers)

### HARNESS-01 — Scaffold @nordcom/commerce-test-convex package skeleton · S · wave 1
- **summary:** New test-harness workspace package replacing test-mongo. package.json (no mongo/mongoose/MMS/payload deps), tsconfig, vitest.config, and the full exports map up front (`.`, `./start`, `./daemon`, `./cli`, `./unit`, `./seed/*`) so sibling tasks only add source files (avoids package.json merge conflicts). Mirror test-mongo's index re-export surface (startConvex/runDaemon/seedCanonical/seedShop/seedCms) as typed stubs. Add `convex` + `convex-test`.
- **files:** packages/test-convex/{package.json,tsconfig.json,vitest.config.ts}, packages/test-convex/src/index.ts
- **depends_on:** —
- **acceptance:** pnpm install resolves the new package linked; `pnpm --filter @nordcom/commerce-test-convex typecheck` passes against stubs; grep `mongo|mongoose|payload` in package.json empty; exports map declares ./start ./daemon ./cli ./unit ./seed.
- **parallel_safe:** true · **worktree:** false · **skills:** convex, tests, monorepo

### HARNESS-02 — Local Convex backend launcher + daemon + CLI (start/stop/reset/seed) · M · wave 3
- **summary:** Port test-mongo's start/daemon/cli lifecycle to spawn a real local Convex backend (`convex dev --local`) instead of MongoMemoryReplSet. Reproduce the orphan-proof shutdown registry (SIGINT/SIGTERM/SIGHUP/beforeExit/exit/uncaught → async stop + sync SIGKILL fallback). Write a CONVEX_URL marker file (analog of .uri/.pid) so `pnpm dev` + e2e re-attach. CLI subcommands start|stop|reset|seed. Pre-build/cache the local-backend binary as a CI artifact. *(weak-acceptance fix: boot-to-ready budget = ≤ 8s p95.)*
- **files:** packages/test-convex/src/{start,daemon,cli}.ts
- **depends_on:** HARNESS-01, CONVEXCORE-02
- **acceptance:** `test-convex start` boots a local backend + writes the CONVEX_URL marker; SIGTERM leaves zero orphan backend processes + removes markers; `test-convex reset` stops + wipes the state dir; boot-to-ready latency recorded ≤ 8s p95 (within the e2e flake budget).
- **parallel_safe:** true · **worktree:** false · **skills:** convex, tests, ci, process-lifecycle

### HARNESS-03 — convex-test unit harness helper + wire into db/cms unit configs · S · wave 7
- **summary:** Thin `convexTest(schema)` wrapper (`src/unit.ts`) for the fast hermetic in-memory unit tier (no backend spawn). Export it + a sample assertion proving a seeded doc round-trips. The convex-test (JS mock) replacement for the per-file `vi.mock('mongoose')` units. Binds against the deployed schema.
- **files:** packages/test-convex/src/{unit,unit.test}.ts
- **depends_on:** HARNESS-01, CONVEXCORE-07, CONVEXCORE-08
- **acceptance:** convexTest helper instantiates against the real schema with no network/subprocess; sample unit inserts + reads a doc through tenantQuery/systemQuery + passes; runs inside `pnpm --filter @nordcom/commerce-test-convex test`.
- **parallel_safe:** true · **worktree:** false · **skills:** convex, convex-test, tests

### HARNESS-04 — Port shop fixture to a Convex seed mutation (shops + credentials + domains) · M · wave 5
- **summary:** Re-express test-mongo's seed/shop.ts as a Convex seed mutation inserting the canonical `nordcom-demo-shop.com` record into the unified shops table, splitting secrets into shopCredentials + alternativeDomains into one shopDomains row per (domain→shopId). Idempotent (skip when the domain exists). Decide explicitly whether to keep/drop the `contentProvider` field (a strict validator rejects unknown keys). Carry design/accents/icons/integrations fixture data verbatim.
- **files:** packages/test-convex/src/seed/shop.ts, packages/test-convex/src/seed/fixtures/shop.ts
- **depends_on:** HARNESS-01, CONVEXCORE-04
- **acceptance:** seed inserts the canonical shop idempotently (second run no-op); secrets land only in shopCredentials, never on the public shops row; alternativeDomains produce one shopDomains row each (by_domain); contentProvider decision documented + the validator accepts the fixture.
- **parallel_safe:** true · **worktree:** false · **skills:** convex, data-migration, tests

### HARNESS-05 — Port CMS singleton + feature-flag fixtures to Convex seed mutations (no Payload boot) · M · wave 6
- **summary:** *(SPLIT — the non-rich-text fixtures.)* Re-express seed/cms.ts + the header/footer/business-data + feature-flags fixtures as Convex seed mutations against the Convex-native CMS tables. Under Option B there is NO Payload boot + NO separate tenants doc — the unified shops row id IS the tenant key, so each doc is written with `shopId = canonical shop id`. Drop the feature-flags `JSON.stringify`-for-Monaco quirk.
- **files:** packages/test-convex/src/seed/cms.ts, packages/test-convex/src/seed/fixtures/{header,footer,business-data,feature-flags}.ts
- **depends_on:** HARNESS-04, CMSDESC-02
- **acceptance:** header/footer/business-data + feature-flags seed under the canonical shop id with no Payload import; storefront getHeader/getFooter for the seeded shop return non-null shapes; feature-flags seed without the JSON.stringify wrapper.
- **parallel_safe:** true · **worktree:** false · **skills:** convex, data-migration, cms, tests

### HARNESS-12 — Port CMS rich-text-bearing fixtures (pages/articles/metadata) · M · wave 10
- **summary:** *(SPLIT from HARNESS-05 — the rich-text-gated fixtures.)* Re-express the pages/articles/product-metadata/collection-metadata fixtures (incl the `lexical.ts` richtext builders) as Convex seed mutations. Rich-text bodies convert to ProseMirror/Tiptap JSON via the CMSRICH-02 converter (or stay Lexical only if a conversion layer is adopted). Each written with `shopId = canonical shop id`.
- **files:** packages/test-convex/src/seed/fixtures/{articles,pages,product-metadata,collection-metadata,richtext}.ts
- **depends_on:** HARNESS-04, CMSDESC-02, CMSRICH-02
- **acceptance:** pages/articles/product-metadata/collection-metadata seed under the canonical shop id with no Payload import; storefront getPage/getArticle return non-null; rich-text fixture bodies validate against the new richtext schema.
- **parallel_safe:** true · **worktree:** false · **skills:** convex, data-migration, cms, tests

### HARNESS-06 — Idempotent canonical seed orchestrator · S · wave 11
- **summary:** Port seed/canonical.ts: one Convex seed run calling the shop seed then the CMS seeds + returning the canonical shop id. Replace the mongoose `createConnection(...).collection('shops').findOne({domain})` id lookup with a Convex query (shops.byDomain). Safe to call repeatedly (the idempotency point both `pnpm dev` first-run seeding + e2e global setup depend on).
- **files:** packages/test-convex/src/seed/{canonical,canonical.test}.ts
- **depends_on:** HARNESS-04, HARNESS-05, HARNESS-12
- **acceptance:** first call seeds shop + all CMS docs, second call a verified no-op (counts unchanged); returns the canonical shop id via a Convex query, not a raw driver; no mongoose/mongodb import anywhere in the file.
- **parallel_safe:** false · **worktree:** false · **skills:** convex, tests

### HARNESS-07 — Rewrite storefront e2e global-setup + fixtures + test:e2e script · M · wave 12
- **summary:** Rewrite `apps/storefront/e2e/global-setup.ts` to drop the `register('@nordcom/commerce-test-mongo/seed-loader')`, the `import mongoose`, and the raw `createConnection(...).findOne` E2E_TENANT_ID lookup; instead call the Convex canonical seed + resolve E2E_TENANT_ID via a Convex query (still emit it — 3 specs consume it). Drop the `NODE_OPTIONS='--import @nordcom/commerce-test-mongo/register-seed-loaders'` from test:e2e. Rewrite `e2e/fixtures/seed-cms.ts` (drop the MONGODB_URI guard, repoint to the Convex seed) + re-export from seed-shop.ts. *(HARNESS owns these files; TEARDOWN only deletes the package — ordering-risk #5.)*
- **files:** apps/storefront/e2e/global-setup.ts, apps/storefront/e2e/fixtures/{seed-cms,seed-shop}.ts, apps/storefront/package.json, apps/storefront/playwright.config.ts
- **depends_on:** HARNESS-02, HARNESS-06, SFREAD-05
- **acceptance:** grep `mongoose|commerce-test-mongo|MONGODB_URI` in storefront e2e empty; test:e2e has no NODE_OPTIONS --import loader string; global-setup emits E2E_TENANT_ID from a Convex query; playwright globalSetup runs against the local Convex backend.
- **parallel_safe:** true · **worktree:** false · **skills:** e2e, playwright, convex

### HARNESS-08 — Rewrite admin e2e global-setup + test:e2e script · M · wave 12
- **summary:** Rewrite `apps/admin/e2e/global-setup.ts`: drop the seed-loader register, `import mongoose`, the inline UserSchema/PayloadUserSchema, and all raw-driver work (User upsert, shops.collaborators $set, tenants lookup, payload-users upsert). Reimplement user + collaborator seeding via Convex mutations against the unified model (no payload-users; tenant link collapses into the unified shop/user records). KEEP the DB-independent NextAuth-v5 JWT cookie minting + storage-state write verbatim (CI `__Secure-` vs dev cookie-name switch). Drop the test:e2e `--import` loader string.
- **files:** apps/admin/e2e/global-setup.ts, apps/admin/package.json
- **depends_on:** HARNESS-02, HARNESS-06, CONVEXCORE-05, CONVEXCORE-14
- **acceptance:** grep `mongoose|commerce-test-mongo|payload-users|MONGODB_URI` in admin e2e empty; test:e2e has no NODE_OPTIONS --import string; user/collaborator seeded via Convex mutations + storage-state cookie still written; the JWT cookie-name CI/dev switch preserved.
- **parallel_safe:** true · **worktree:** false · **skills:** e2e, playwright, convex, nextauth

### HARNESS-09 — Rebuild vitest.setup mongoose mocks (db/cms/admin/storefront) + auth.adapter.test · M · wave 9
- **summary:** Strip every Mongo artifact from the unit-test setups. db + admin vitest.setup: remove `vi.mock('mongoose', importActual…)` + `vi.stubEnv('MONGODB_URI')` (these importActual REAL mongoose — the easiest place for it to survive db.ts deletion); replace with convex-test setup. cms vitest.setup: drop the MONGODB_URI stub (and under Option B the now-unnecessary next/cache + server-only stubs). storefront vitest.setup: replace the Mongoose-shaped `Shop.findByDomain` mock with one matching the Convex-backed shop accessor (keep the real theme importActual). Rewrite `auth.adapter.test.ts` to drop `import mongoose` + `mongoose.model(...)` for plain object / Convex doc shapes.
- **files:** packages/db/vitest.setup.ts, packages/cms/vitest.setup.ts, apps/admin/vitest.setup.ts, apps/storefront/vitest.setup.ts, apps/admin/src/utils/auth.adapter.test.ts
- **depends_on:** HARNESS-03, SFREAD-05
- **acceptance:** grep `vi.mock('mongoose')|importActual.*mongoose|stubEnv('MONGODB_URI'` across packages/apps empty; auth.adapter.test no longer imports mongoose; `MONGODB_URI= pnpm test` green for db/cms/admin/storefront; storefront Shop mock returns the Convex-shaped OnlineShop.
- **parallel_safe:** true · **worktree:** false · **skills:** tests, vitest, convex, payload-removal

### HARNESS-10 — Limit-boundary integration tests against the real local Convex backend · M · wave 11
- **summary:** The tests convex-test (JS mock) cannot catch — run against the real local backend where doc-size + scan ceilings are enforced: (1) a 1 MiB max-locale rich-text `pages` fixture with golden shred/reassemble round-trip; (2) a tenant list past the 32k-doc/16 MiB ceiling asserting a typed `BoundedScanExceededError` not silent truncation; (3) concurrent 2s-autosave OCC characterization at target concurrency; (4) deep-populate of header depth:6. *(weak-acceptance fix: OCC budget = retry rate ≤ 1% + zero lost writes at 20 concurrent editors/doc.)* Wire into CI within the flake budget using the cached backend.
- **files:** packages/test-convex/src/limits/{doc-size,scan-ceiling,autosave-occ,deep-populate}.test.ts
- **depends_on:** HARNESS-02, HARNESS-12, CMSDATA-10, CMSDATA-11, CMSFORM-05
- **acceptance:** 1 MiB max-locale fixture round-trips byte-identical through shred→reassemble; tenant list past the ceiling throws BoundedScanExceededError; concurrent-autosave OCC retry rate ≤ 1% + zero lost writes at 20 editors/doc recorded; header depth:6 deep-populate reassembles; suite runs in CI within the flake budget.
- **parallel_safe:** true · **worktree:** false · **skills:** convex, tests, limits, ci

---

## Track PIPELINE — deterministic ETL + reconciliation + freeze-window outbox

### PIPELINE-01 — Idempotent ETL core: mongoexport → deterministic transform → convex import · M · wave 6
- **summary:** The re-runnable per-collection pipeline: `mongoexport` each collection to JSONL → a PURE deterministic transform that (a) remaps every Mongo ObjectId to a Convex id while preserving the original as `legacyId` (projected to the public shop.id string), (b) emits a stable `by_payloadId` key, (c) normalizes shops.alternativeDomains into one shopDomains row per (domain→shopId) → `convex import`. Determinism is the contract: re-running yields byte-identical Convex state. Targets the Phase-0 unified shape.
- **files:** scripts/etl/{export,import}.ts, scripts/etl/transform/{index,id-remap}.ts
- **depends_on:** UNIFY-10, CONVEXCORE-04, CONVEXCORE-05
- **acceptance:** running the pipeline twice produces identical Convex state (idempotent); every doc carries legacyId + shop.id resolves to legacyId not the Convex _id; alternativeDomains produce one shopDomains row per (domain→shopId); the transform is a pure function covered by golden input/output fixtures.
- **parallel_safe:** true · **worktree:** false · **skills:** data-migration, convex, etl

### PIPELINE-02 — ETL rich-text shred + _versions + media migration in the transform · M · wave 10
- **summary:** Extend the transform for the large/structured docs: shred all-locales-in-one-doc rich-text (+ large blocks) into `_i18n` side rows keyed `(parentLegacyId, fieldPath, locale)` under 1 MiB (per CMSDATA-10), small scalars inline; migrate per-collection `_versions` rows (incl a per-doc quiesce/catch-up for the 2s-autosave moving target); relocate Payload media docs (S3/R2 keys preserved, the storage-hook side effect moved to a `scheduler.runAfter(0)` action). Rich-text converted Lexical→ProseMirror in lockstep via the CMSRICH-04 codec.
- **files:** scripts/etl/transform/{shred-richtext,versions,media}.ts
- **depends_on:** PIPELINE-01, CMSDESC-02, CMSRICH-04, CMSMEDIA-01
- **acceptance:** every shredded _i18n side row is < 1 MiB + reassembles to the source doc; _versions rows migrate with latestVersionId pointers intact; media docs carry their original S3/R2 keys + the storage side effect is a post-commit action; rich-text round-trips through the Lexical→ProseMirror conversion.
- **parallel_safe:** true · **worktree:** false · **skills:** data-migration, convex, richtext, media

### PIPELINE-03 — Cross-reference id-remap coverage (internal + externally-persisted shopId) · M · wave 7
- **summary:** Guarantee the id remap reaches every shopId/ObjectId reference: sessions.user, collaborators, featureFlags refs, reviews.shopId, PLUS cart records, analytics, and externally-persisted shopId in Shopify webhooks/metafields, client cookies, and cached/ISR output. The public shop.id string contract (== legacyId) preserved so external references stay valid. A reference-integrity verifier failing if any reference dangles post-import.
- **files:** scripts/etl/remap/{references,external-refs,verify-integrity}.ts
- **depends_on:** PIPELINE-01
- **acceptance:** every shopId reference (sessions/collaborators/featureFlags/reviews/carts/analytics) resolves to a live shops row post-import; public shop.id equals legacyId for all externally-persisted references; the integrity verifier reports zero dangling references.
- **parallel_safe:** true · **worktree:** false · **skills:** data-migration, convex, etl

### PIPELINE-04 — Reconciliation action: full per-collection checksum parity + divergence ledger · M · wave 11
- **summary:** Reconciliation as a first-class Convex action: a full per-collection canonical checksum (cheap at tenant-scoped volume — NOT a stratified sample) through the same shred/reassemble transform, AND a second INDEPENDENT reassembly path so a transform bug surfaces as a divergence rather than two identical-wrong hashes. A continuous divergence ledger. The parity gate authorizing cutover; runnable against the imported snapshot (no live dual-write under zero-temporary-Mongo).
- **files:** packages/convex/convex/reconcile.ts, scripts/etl/reconcile/{checksum,independent-reassembly}.ts
- **depends_on:** PIPELINE-01, PIPELINE-02, PIPELINE-03
- **acceptance:** per-collection checksum parity green after a clean import; an injected transform bug is caught as a divergence (the second reassembly diverges, not identical-wrong); the divergence ledger populated + queryable; reconciliation runs as a deployed Convex action.
- **parallel_safe:** true · **worktree:** false · **skills:** convex, data-migration, reconciliation

### PIPELINE-05 — Freeze-window write-capture (transactional outbox + idempotent drainer) · M · wave 12
- **summary:** The write-capture closing the export window WITHOUT ever running two authoritative databases: during the maintenance freeze each Mongo write appends an outbox row in the SAME write; an idempotent drainer applies outbox entries to Convex at-least-once via upsert keyed `by_payloadId`, incl _versions/autosave catch-up. Honoring ZERO-temporary-Mongo, this is explicitly a bounded quiesce-window catch-up for the one-shot cutover (export → drain residual writes → flip), NOT a sustained steady-state dual-write bake. Documented in the runbook. *(weak-acceptance fix: drain bound = residual writes drained ≤ 60s after freeze, measured by the outbox lag cursor.)*
- **files:** scripts/etl/outbox/{append,drainer}.ts, scripts/etl/outbox/runbook.md
- **depends_on:** PIPELINE-01, PIPELINE-04
- **acceptance:** the drainer is at-least-once AND idempotent (replaying the outbox produces no duplicate Convex rows); writes during the freeze land in Convex before the flip with measured drain lag ≤ 60s; runbook documents the outbox as freeze-window-only, reconciling with never-two-databases; post-drain reconciliation (PIPELINE-04) green.
- **parallel_safe:** false · **worktree:** false · **skills:** data-migration, convex, outbox

---

## Track CUTOVER — one-shot freeze→export→drain→flip (NO sustained dual-write)

> **Governing constraint (critic ordering-risk #2 + user mandate).** Plan Phase 8's dual-write/dual-read/canary-while-dual-writing model is **REPLACED**. There is no sustained period with Mongo authoritative AND a live Convex mirror being written. The storefront flip is a single bounded window: maintenance freeze → final export → outbox drain of residual freeze writes → full-collection reconcile → flip read+write authority → stop Mongo. The CMS read-shadow (SFREAD-12) reads a candidate for comparison only; it is not a second authoritative write store. Reverse-ETL / one-way-gate is the rollback net, proven BEFORE the irreversible flip.

### CUTOVER-01 — Cutover dress rehearsal + numeric go/no-go budgets · M · wave 12
- **summary:** The go/no-go gate run BEFORE the freeze, against the imported snapshot (no live dual-write). Run the full ETL + reconciliation (PIPELINE-04) to full per-collection checksum parity; measure the findByDomain miss-path p50/p99 from the real middleware region vs the Convex region (SFREAD-04) and the per-tenant Convex call volume/cost. *(weak-acceptance fix: pre-committed budgets — p50 ≤ 40ms / p99 ≤ 150ms miss-path; per-tenant ≤ 50k Convex calls/day alert ceiling; canary-tenant soak ≥ 24h + full-cohort soak ≥ 72h with ≥ 1,000 sampled reads/active-tenant + zero divergence.)*
- **files:** .specs/2026-05-30-convex-migration/cutover-budgets.md, scripts/etl/reconcile/checksum.ts, apps/storefront/src/middleware/storefront.test.ts
- **depends_on:** PIPELINE-04, SFREAD-04, SFREAD-05, CONVEXCORE-15
- **acceptance:** full per-collection checksum parity green on the imported snapshot; p50/p99 miss-path recorded vs the committed budget; per-tenant call/cost ceiling recorded vs the committed budget; soak floor + per-tenant sample threshold documented; a written go/no-go recorded — flip blocked if any budget is missed.
- **parallel_safe:** false · **worktree:** false · **skills:** convex, perf, data-migration

### CUTOVER-02 — Reverse-ETL (Convex→Mongo) green OR one-way-gate sign-off + final pre-flip backup · M · wave 13
- **summary:** The rollback net proven BEFORE any irreversible flip: a reverse-ETL (Convex→Mongo) running a SECOND independent reassembly of the Phase-7 transform (so a transform bug surfaces as divergence, not identical-wrong hashes) reaching **full per-collection checksum parity** *(weak-acceptance fix: full-collection, NOT a sample restore)*, OR a signed one-way-gate checklist (full parity + N-day bake + canary soak). Plus a final pre-flip Mongo cold backup → object storage.
- **files:** packages/convex/convex/reverse-etl.ts, scripts/etl/reconcile/independent-reassembly.ts, .specs/2026-05-30-convex-migration/one-way-gate.md
- **depends_on:** PIPELINE-04, CUTOVER-01
- **acceptance:** reverse-ETL replays Convex→Mongo to FULL per-collection checksum parity (not a sample) on a restore, OR the one-way-gate checklist is signed (full parity + N-day bake + canary soak); a final Mongo cold backup is taken + its restore verified; the chosen path documented + demonstrably green before CUTOVER-03.
- **parallel_safe:** true · **worktree:** true · **skills:** convex, data-migration, tests

### CUTOVER-03 — One-shot storefront-services authority flip (freeze→export→drain→reconcile→flip→stop) · M · wave 14
- **summary:** The single bounded storefront cutover window for the packages/db services. Sequence: maintenance freeze → final `mongoexport` → drain residual freeze-window writes via the PIPELINE-05 outbox → full-collection reconcile (PIPELINE-04) → flip `DB_BACKEND_*=convex` (reads + writes authority) → stop Mongo writes. Lowest-risk services (session/identity) ordered first within the window; the canary tenant validated first before the cohort. Past the flip, recovery = the CUTOVER-02 reverse-ETL/one-way gate, never a flag-back.
- **files:** packages/db/src/services/, scripts/etl/outbox/drainer.ts, .specs/2026-05-30-convex-migration/storefront-cutover-runbook.md
- **depends_on:** CUTOVER-01, CUTOVER-02, PIPELINE-05, SFREAD-05, SFREAD-06, SFREAD-14, SFREAD-04, SFREAD-11, SFREAD-13
- **acceptance:** during the window Mongo is frozen (zero new authoritative writes), residual writes drained ≤ 60s, reconcile green, then authority flips atomically per service (session/identity first); post-flip Mongo receives zero writes (verified via write-path instrumentation / quiet oplog) + Convex authoritative; at no point are both stores serving authoritative writes; full per-collection parity recorded at the flip; ledger clean.
- **parallel_safe:** false · **worktree:** false · **skills:** convex, data-migration

### CUTOVER-04 — CMS header+pages gate-collection coordinated cutover (write + read together) · M · wave 14
- **summary:** *(SPLIT from old CUTOVER-07 — gate collections first.)* Cut over the two hardest collections (header recursive nav + pages blocks) in a coordinated step: ETL their content to Convex, flip admin authoring to the Convex-native CMS, and flip the storefront reads to Convex for these collections together (SFREAD-12 dual-read proves zero divergence first), so no collection is authored to Convex while still read stale from Mongo. Publish fires the Convex→Next bridge (not Payload afterChange). **Gated on both parity gates + the bridge.**
- **files:** apps/admin/src/, packages/cms/src/editor/manifests/{header,pages}.ts, apps/storefront/src/api/{header,page}.ts
- **depends_on:** CMSGATE-01, CMSGATE-02, BRIDGE-12, SFREAD-12, PIPELINE-02, CUTOVER-02, CMSRICH-03 *(↳ CMSRICH-03 = rich-text fidelity gate; no content cutover until Lexical→ProseMirror round-trips with zero loss)*
- **acceptance:** header + pages author end-to-end on Convex (create/edit/draft/2s-autosave/publish/restore) with no Payload write path for these collections; storefront reads for header + pages served from Convex with zero divergence vs the SFREAD-12 ledger + null-on-missing preserved; publish fires the bridge, autosave never revalidates; secret-exposure tests green.
- **parallel_safe:** true · **worktree:** true · **skills:** convex, react, payload-removal, tests

### CUTOVER-05 — CMS articles + productMetadata + collectionMetadata cohort cutover · M · wave 15
- **summary:** *(SPLIT from old CUTOVER-07 — cohort 2.)* Coordinated write+read cutover for the articles + product/collection-metadata cohort (rich-text-bearing), after the gate collections are proven. Same pattern: ETL → flip admin authoring → flip storefront reads together, SFREAD-12 divergence-clean first.
- **files:** apps/admin/src/, packages/cms/src/editor/manifests/{articles,product-metadata,collection-metadata}.ts, apps/storefront/src/api/{article,metadata}.ts
- **depends_on:** CUTOVER-04
- **acceptance:** the 3 collections author end-to-end on Convex with no Payload write path; storefront reads served from Convex with zero divergence + null-on-missing preserved; rich-text renders via ProseMirror; publish fires the bridge.
- **parallel_safe:** true · **worktree:** true · **skills:** convex, react, payload-removal, tests

### CUTOVER-06 — CMS footer/businessData + reviews/feature-flags/media cohort cutover (removes last Payload write path) · M · wave 16
- **summary:** *(SPLIT from old CUTOVER-07 — final cohort.)* Coordinated write+read cutover for the remaining collections (footer + businessData singletons, reviews, feature-flags, media). This removes the LAST Payload write path and unblocks Payload application deletion (TEARDOWN-02). Same coordinated pattern + the media pipeline live.
- **files:** apps/admin/src/, packages/cms/src/editor/manifests/{footer,business-data,reviews,feature-flags,media}.ts, apps/storefront/src/api/{footer,info-bar}.ts
- **depends_on:** CUTOVER-05
- **acceptance:** all remaining collections author end-to-end on Convex; the 38 getters across 33 files serve identical shapes from Convex (matches the SFREAD-01 inventory), null-on-missing preserved; admin no longer boots Payload/mongooseAdapter on any collection; media uploads produce 4 sizes via the live pipeline; ledger clean.
- **parallel_safe:** true · **worktree:** true · **skills:** convex, react, payload-removal, tests

---

## Track TEARDOWN — decommission & zero-Mongo gate

> **Ordering gate (critic ordering-risk #6 + teardown DoD).** PROCESS/STATE FIRST: final backup → kill live processes → scrub state, BEFORE deleting any script (the orphan reaper `clean-mongo.ts` must still exist). Full Payload application removal (TEARDOWN-02) precedes db-mongodb removal (TEARDOWN-05, which kills transitive mongoose@8). Direct mongoose@9 (TEARDOWN-04) is removable only after packages/db runs on Convex (SFREAD-03/05/06) AND the e2e global-setups stopped importing mongoose (HARNESS-07/08/09).

### TEARDOWN-00 — Final Mongo cold backup / archive before decommission · S · wave 17
- **summary:** *(ADDED — critic missing #6.)* A final `mongodump` cold archive of the production Mongo (both backends' data) to object storage, taken AFTER all cutovers complete but BEFORE any process kill / state purge. This is the last recoverable snapshot once the Convex one-way gate is crossed.
- **files:** scripts/etl/final-mongo-archive.ts, .specs/2026-05-30-convex-migration/final-backup.md
- **depends_on:** CUTOVER-03, CUTOVER-06
- **acceptance:** a full mongodump of both backends is archived to object storage + a restore is verified to a scratch instance; the archive location + retention recorded; taken before TEARDOWN-01 kills any process.
- **parallel_safe:** false · **worktree:** false · **skills:** data-migration, ci

### TEARDOWN-01 — PROCESS/STATE FIRST — kill live Mongo/MCP processes + scrub machine-local state · S · wave 18
- **summary:** Decommission step zero (after the final archive, before deleting any script). SIGTERM the live daemon chain (mongo-daemon 10419 → mongod 10422 on 27018 → mongo_killer 10423) via `pnpm dev:reset` or by PID; remove the running mongodb-mcp-server MCP wiring from Claude/IDE settings; `rm -rf .mongo-dev/` + `rm -rf ~/.cache/mongodb-binaries`; strip the live MONGODB_URI line + commented MONGODB_URI_TEST from .env.local; add CONVEX_URL.
- **files:** .env.local, .mongo-dev/, ~/.cache/mongodb-binaries, Claude/IDE MCP settings
- **depends_on:** TEARDOWN-00, CUTOVER-03, CUTOVER-06
- **acceptance:** `ps aux | grep -iE 'mongod|mongo-daemon|mongo_killer|mongodb-mcp-server'` empty; .mongo-dev/ absent + ~/.cache/mongodb-binaries absent; grep MONGODB_URI/MONGODB_URI_TEST in .env.local empty + CONVEX_URL present.
- **parallel_safe:** false · **worktree:** false · **skills:** ci, convex

### TEARDOWN-02 — Remove the full Payload application surface · M · wave 17
- **summary:** *(ADDED — critic missing #1; the linchpin for removing transitive mongoose@8. Reuses the freed TEARDOWN-02 id.)* With admin fully cut off Payload (CUTOVER-06), delete the rest of Payload beyond the adapter: `@payloadcms/ui`, `@payloadcms/next`, `@payloadcms/richtext-lexical`, `@payloadcms/plugin-multi-tenant`, `@payloadcms/storage-s3`, `@payloadcms/email-resend`, `payload` itself; `apps/admin/src/payload.config.ts`; the `/cms` route mount; and the ~92 remaining payload imports. (db-mongodb is removed in TEARDOWN-05.)
- **files:** apps/admin/src/payload.config.ts, apps/admin/src/app/(payload)/, packages/cms/package.json, apps/admin/package.json, packages/cms/src/**(payload imports)
- **depends_on:** CUTOVER-06, HARNESS-08
- **acceptance:** grep `@payloadcms/(ui|next|richtext-lexical|plugin-multi-tenant|storage-s3|email-resend)|from 'payload'` across apps/packages empty; payload.config.ts + the /cms mount deleted; admin builds + boots with no Payload import; `pnpm why -r payload` reports no packages.
- **parallel_safe:** true · **worktree:** true · **skills:** payload-removal, convex, ci

### TEARDOWN-03 — Delete @nordcom/commerce-test-mongo package + all referrers + allowBuilds · M · wave 17
- **summary:** *(folds removed HARNESS-11.)* Delete the entire `packages/test-mongo` package (cli/daemon/start/index, the 4 .mjs loaders, seed/* + fixtures/*, configs, README, tsconfig). Remove all 4 `workspace:*` referrers (root:96, admin:60, storefront:63, self) — the 2 test:e2e `--import` strings are already gone (HARNESS-07/08). Drop the `pnpm-workspace.yaml allowBuilds: mongodb-memory-server` entry. Regenerate the lockfile; confirm mongodb-memory-server drops.
- **files:** packages/test-mongo/, package.json, apps/admin/package.json, apps/storefront/package.json, pnpm-workspace.yaml, pnpm-lock.yaml
- **depends_on:** HARNESS-07, HARNESS-08, HARNESS-09, HARNESS-10, CUTOVER-03, CUTOVER-06
- **acceptance:** `git ls-files packages/test-mongo` empty; `git grep '@nordcom/commerce-test-mongo'` (excl lock) empty (4 links + 2 NODE_OPTIONS strings gone); `mongodb-memory-server` absent from pnpm-workspace.yaml + the lockfile after install.
- **parallel_safe:** false · **worktree:** false · **skills:** ci, data-migration

### TEARDOWN-04 — Remove direct mongoose@9 (packages/db + root hoist-anchor) + regenerate lockfile · S · wave 18
- **summary:** Remove direct `mongoose@9.6.3` from packages/db/package.json:65 + the root devDep hoist-anchor (package.json:108). Safe only after packages/db runs on Convex (no mongoose import) AND the e2e global-setups stopped importing mongoose (HARNESS-07/08), so the hoist anchor is no longer needed. `pnpm install`; confirm the mongoose@9 tree (mongodb@7.2.0, bson, saslprep) vanishes. (Transitive mongoose@8 behind Payload remains until TEARDOWN-05.)
- **files:** packages/db/package.json, package.json, pnpm-lock.yaml
- **depends_on:** SFREAD-03, SFREAD-05, SFREAD-06, HARNESS-07, HARNESS-08, HARNESS-09, TEARDOWN-03
- **acceptance:** `pnpm why -r mongoose` no longer reports the 9.6.3 tree (8.x may persist until TEARDOWN-05); lockfile has no mongoose@9.6.3 / mongodb@7.2.0 snapshots; `pnpm install --frozen-lockfile` passes.
- **parallel_safe:** false · **worktree:** false · **skills:** ci, data-migration

### TEARDOWN-05 — Remove Payload Mongo-adapter wiring + @payloadcms/db-mongodb (transitive mongoose@8) · M · wave 19
- **summary:** With Payload removed (TEARDOWN-02), delete the residual Mongo-adapter rows: `@payloadcms/db-mongodb` from packages/cms (dep+peer+dev) + admin:66; the `db: mongooseAdapter({ url: mongoUrl })` wiring (config/index.ts:221), get-payload-instance.ts:27 `?? ''`, build-test-config.ts adapter, generate-types-config.ts hardcoded URI, the MONGODB_URI gates in payload.config.ts. Rework/remove the resolve-tenant-id.ts read-path bridge + the ObjectId `'text'` idType assumptions. Regenerate the lockfile; confirm transitive mongoose@8.22.1 (mongodb@6, bson, mongoose-paginate-v2, mongoose-lean-virtuals) vanishes.
- **files:** packages/cms/package.json, apps/admin/package.json, packages/cms/src/config/index.ts, packages/cms/src/api/{get-payload-instance,resolve-tenant-id}.ts, packages/cms/src/test-utils/build-test-config.ts, packages/cms/src/types/generate-types-config.ts, apps/admin/src/payload.config.ts, pnpm-lock.yaml
- **depends_on:** TEARDOWN-02, TEARDOWN-04, CUTOVER-06
- **acceptance:** grep `mongooseAdapter|@payloadcms/db-mongodb|mongoUrl|MONGODB_URI` in cms/src + admin/src + db/src empty; `pnpm why -r @payloadcms/db-mongodb` + `pnpm why -r mongoose` report no packages (BOTH majors gone); `pnpm cms:gen:check` passes without a Mongo adapter; resolve-tenant-id read-path reworked/removed.
- **parallel_safe:** false · **worktree:** false · **skills:** payload-removal, convex, ci

### TEARDOWN-06 — Delete scripts/*-mongo.ts + root lifecycle hooks atomically · S · wave 19
- **summary:** Delete `scripts/{predev-mongo,postdev-mongo,mongo-daemon,clean-mongo,dev-reset}.ts` + remove the root mongo lifecycle hooks ATOMICALLY (predev/postdev + the predev:*/postdev:* delegates, prebuild/postbuild, pretest/posttest, dev:mongo, dev:reset, clean:mongo) — KEEPING the portless-proxy half of predev. Wire `convex dev` for the dev/e2e lifecycle. After TEARDOWN-01 (live daemon dead) + TEARDOWN-04 (serialize root package.json edits).
- **files:** scripts/{predev-mongo,postdev-mongo,mongo-daemon,clean-mongo,dev-reset}.ts, package.json
- **depends_on:** TEARDOWN-01, TEARDOWN-04
- **acceptance:** the 5 scripts deleted; grep `predev-mongo|postdev-mongo|mongo-daemon|clean-mongo|dev-reset` in package.json/scripts empty; portless-proxy half of predev retained; `pnpm dev`/`build`/`test` no longer invoke any Mongo hook + run green.
- **parallel_safe:** false · **worktree:** false · **skills:** ci, convex

### TEARDOWN-07 — CI cleanup (ci.yml + both composite actions) + env templates · S · wave 20
- **summary:** Remove MONGOMS_VERSION + MONGOMS_DOWNLOAD_DIR env + ALL mongo-binary-cache-hit/save-mongo-binary wiring from ci.yml AND both shared composite actions (bootstrap + bootstrap-save) — editing only ci.yml leaves deploy/release/docs still restoring the cache. Replace MONGODB_URI with Convex vars in the 3 .env.example; update .gitignore (drop .mongo-dev, add the Convex local-state dir if self-hosting).
- **files:** .github/workflows/ci.yml, .github/common/bootstrap/action.yml, .github/common/bootstrap-save/action.yml, .env.example, apps/storefront/.env.example, apps/admin/.env.example, .gitignore
- **depends_on:** TEARDOWN-04, TEARDOWN-05
- **acceptance:** grep `MONGOMS|mongodb-binaries|mongo-binary-cache-hit|save-mongo-binary` in .github empty; grep MONGODB_URI/MONGODB_URI_TEST in the env.example files empty + .gitignore has no .mongo-dev; CI green on a frozen install.
- **parallel_safe:** true · **worktree:** true · **skills:** ci

### TEARDOWN-08 — Docs & domain knowledge — CLAUDE.md / CONTEXT.md / READMEs / .mdx + regenerate · S · wave 20
- **summary:** Update hand-written Mongo references: CLAUDE.md (16,38), CONTEXT.md (77,273,278), root README + the 5 package READMEs, the doc .mdx sources (packages/db/docs/*, packages/cms/docs/*, apps/storefront/docs/routing.mdx) for the Convex data layer. Regenerate apps/docs via `pnpm gen` so the generated tree drops the test-mongo / db-mongoose pages.
- **files:** CLAUDE.md, CONTEXT.md, README.md, apps/{admin,storefront}/README.md, packages/{cms,db}/README.md, packages/db/docs/*.mdx, packages/cms/docs/*.mdx, apps/storefront/docs/routing.mdx
- **depends_on:** TEARDOWN-04, TEARDOWN-05, TEARDOWN-06
- **acceptance:** grep `mongo` in CLAUDE.md/CONTEXT.md/README.md/*/README.md/*/docs/*.mdx/routing.mdx empty; `pnpm gen` regenerates docs with no test-mongo / db-mongoose pages remaining.
- **parallel_safe:** true · **worktree:** true · **skills:** docs

### TEARDOWN-09 — Final zero-Mongo acceptance gate — 18-command verification + clean rebuild + MONGODB_URI= green · M · wave 21
- **summary:** Run the zero-Mongo acceptance gate. Purge build artifacts (`find . -name '*.tsbuildinfo' … -delete`; `rm -rf .turbo packages/*/.turbo apps/*/.turbo packages/*/dist`) then `pnpm build:packages` so dist carries no compiled mongoose. Execute all 18 verification commands; confirm `MONGODB_URI= pnpm build:packages && MONGODB_URI= pnpm typecheck && MONGODB_URI= pnpm test` green + `pnpm cms:gen:check` passes; confirm the full ZERO-MONGO DoD checklist all-green. No changeset.
- **files:** packages/*/dist, .turbo, *.tsbuildinfo (verification only)
- **depends_on:** TEARDOWN-00, TEARDOWN-01, TEARDOWN-02, TEARDOWN-03, TEARDOWN-04, TEARDOWN-05, TEARDOWN-06, TEARDOWN-07, TEARDOWN-08
- **acceptance:** all 18 verification commands pass (git grep for mongo/mongoose/MONGODB_URI/MONGOMS/ObjectId empty outside .specs + generated docs; `pnpm why` finds no mongo family incl both majors + db-mongodb; frozen install passes; dist .js carries zero mongoose); `MONGODB_URI= pnpm build:packages && typecheck && test` green with the var blank; `pnpm cms:gen:check` passes; no mongod/mongo-daemon/mongodb-mcp-server process; .mongo-dev/ + ~/.cache/mongodb-binaries absent.
- **parallel_safe:** false · **worktree:** false · **skills:** ci, tests
