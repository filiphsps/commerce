# Cutover budgets & go/no-go (CUTOVER-01)

Numeric go/no-go budgets for the Mongo→Convex cutover, the recorded dress rehearsal, and the
operator-signed go/no-go checklist. CUTOVER-01 owns the go/no-go table; contributed sections
(SFREAD-13) are kept verbatim below. **The flip is BLOCKED while any budget below is missed or any
checklist gate is red.**

---

## 1. Dress rehearsal — recorded run (2026-06-11, in-sandbox)

The full pre-freeze pipeline, orchestrated end-to-end by the committed driver
`scripts/etl/rehearsal/run.ts`: export-shaped (mongoexport extended-JSON) input → PIPELINE-01 core
transform + PIPELINE-02 CMS shred (Lexical→ProseMirror through the real CMSRICH-04 codec) → import
into a Convex world (surrogate→real id relink, the exact relink the live import performs) →
PIPELINE-04 **dual-path** checksum reconciliation (script-side `scripts/etl/reconcile/checksum.ts`
with the clean-room `independent-reassembly.ts` vs the in-Convex `convex/reconcile.ts` sweep using
the runtime's own `reassembleShreddedFields`) → divergence ledger read-back → verdict.

**Corpus:** 24 tenants; every reconciled table populated; three CMS collection families covering
both shred shapes (registered shredded field: `articles.body`, `productMetadata.descriptionOverride`;
block-embedded rich text converted inline: `pages.content`), two locales per document.

**Command (real output below, captured verbatim):**

```
cd packages/test-convex && vitest run src/cutover-rehearsal.test.ts   # 2 passed (2), exit 0
```

### Rehearsal run `dress-rehearsal` — **GO**

Phases: transform 10 ms · expected-side checksums 21 ms · import 15 ms · reconcile sweep 61 ms · total 106 ms

| Staged table | Rows | In checksum corpus |
| --- | ---: | --- |
| `shops` | 24 | yes |
| `shopCredentials` | 24 | yes |
| `shopDomains` | 48 | yes |
| `shopCollaborators` | 0 | no — see driver JSDoc |
| `shopFeatureFlags` | 48 | yes |
| `featureFlags` | 8 | yes |
| `reviews` | 96 | yes |
| `cmsDocuments:articles` | 72 | yes |
| `cms_i18n:articles` | 144 | no — see driver JSDoc |
| `cmsDocuments:pages` | 48 | yes |
| `cms_i18n:pages` | 0 | no — see driver JSDoc |
| `cmsDocuments:productMetadata` | 24 | yes |
| `cms_i18n:productMetadata` | 48 | no — see driver JSDoc |

Reconcile summary: 9 collections compared, 0 mismatched. Transform divergences: 0.

| Ledger collection | Status | Expected | Actual |
| --- | --- | ---: | ---: |
| `cmsDocuments:articles` | match | 72 | 72 |
| `cmsDocuments:pages` | match | 48 | 48 |
| `cmsDocuments:productMetadata` | match | 24 | 24 |
| `featureFlags` | match | 8 | 8 |
| `reviews` | match | 96 | 96 |
| `shopCredentials` | match | 24 | 24 |
| `shopDomains` | match | 48 | 48 |
| `shopFeatureFlags` | match | 48 | 48 |
| `shops` | match | 24 | 24 |

(`shopCollaborators` is staged but deliberately outside the checksum corpus — its `user` edge has no
stable cross-side identity; the PIPELINE-03 reference-integrity verifier covers it. `cms_i18n` side
rows are verified THROUGH their reassembled parents, both sides independently.)

The SAME run also proved the gate can fail: a second rehearsal with one `cms_i18n` side row deleted
post-import (freeze-window-drift shape) read **NO-GO** with exactly one `mismatch` ledger row naming
the drifted CMS collection (`dress-rehearsal-drift`, same suite, same command).

### What this rehearsal proves — and what it cannot

- **Proves (in-sandbox):** the pipeline's mechanics end-to-end — transform determinism, the
  surrogate relink, schema-shaped staging, dual-path checksum parity on a multi-tenant corpus, the
  ledger's locate-the-offender behavior, and the conservative GO/NO-GO verdict (any divergence,
  mismatch, or summary/ledger disagreement reads NO-GO).
- **Cannot prove (operator-only):** prod-scale wall-clock (the sandbox world is in-memory
  `convex-test`; a real deployment adds network + `convex import` CLI time), the production dump's
  content (rich-text fidelity beyond the in-repo corpus), and production-region latency. These are
  the outstanding checklist rows in §4.

### Freeze-window duration estimate (derivation)

Every measured phase is linear in row count (transform/checksums are pure per-row work; the
reconcile sweep paginates at 256 rows/page with bounded per-page reads). The rehearsal's 504 staged
rows cost ~106 ms of pure pipeline compute — compute is **not** the freeze-window driver. The
operator's window estimate is dominated by I/O steps the sandbox cannot time:

```
freeze window ≈ mongoexport (per collection)
              + tsx scripts/etl/import.ts --execute   (per-table `convex import`, network-bound)
              + outbox drain                          (scripts/etl/outbox/runbook.md §drain — residual
                                                       freeze writes only; idempotent, re-runnable)
              + reconcile sweep                       (reconcile:run — paginated; rehearsal shows
                                                       ~0.12 ms/row of compute; budget network RTT
                                                       per 256-row page)
              + flip + canary validation              (CUTOVER-03 sequence)
```

The operator MUST run the same driver against the staging import of the production dump (checklist
§4 row R2) and record real per-phase timings there before scheduling the freeze; that run, not this
sandbox figure, sizes the maintenance window.

---

## 2. Pre-committed numeric budgets

These are the budgets the program committed at SPIKE-01/SFREAD-04/SFREAD-13. **A miss on any row
blocks the flip.**

| # | Budget | Committed ceiling | Current standing | Source of record |
| --- | --- | --- | --- | --- |
| B1 | `findByDomain` warm (cached) p50 | ≤ 40 ms | **0.00 ms — PASS** (cache hit never leaves the process) | `sfread-04-benchmark.md` §3–4 |
| B2 | `findByDomain` miss-path p99 | ≤ 150 ms | **145.61 ms — PASS** from the workstation vantage (~105 ms cross-region RTT floor included); SPIKE-01 §8 cloud baseline 193.77 ms at the same vantage with 1k tenants — no regression, seam beats the spike | `sfread-04-benchmark.md` §3–4; `spike-01-findbydomain-feasibility.md` §8 |
| B3 | Per-tenant Convex calls/day | ≤ 50,000 (alert ceiling) | **PASS with flagged sensitivity**: request path ≈ `1,728 × P + ~170` (P = warm edge instances/tenant); PASS for `P ≤ 28`, breaches at `P ≳ 29`. Build fan-out ≤ 135 calls/tenant/day at `B = 3, L = 5, ≤ 5 builds/day` (< 0.3% of ceiling, pinned by the counting suite) | `spike-01-findbydomain-feasibility.md` (cost model, AC2); §5 below (SFREAD-13) |
| B4 | Canary tenant soak | ≥ 24 h | **NOT STARTED** — operator-only (starts at flip) | this doc (committed at CUTOVER-01) |
| B5 | Full-cohort soak | ≥ 72 h, with **≥ 1,000 sampled reads per active tenant** | **NOT STARTED** — operator-only | this doc (committed at CUTOVER-01) |
| B6 | Shadow-read divergence during soak | **ZERO unexplained rows** in the SFREAD-12 ledger (`cmsReadDivergence` table; written by `apps/storefront/src/api/_cms-shadow.ts`) | Shadow live and non-blocking; ledger empty on the dev deployment | SFREAD-12 (`_cms-shadow.ts`), `cmsReadShadowTables` |

Notes binding the budgets:

- **B1/B2** were adjudicated at G-SPIKE and regression-checked after the real seam landed
  (SFREAD-04). The standing caveat is inherited unchanged: workstation numbers are an *upper bound*
  (cross-region RTT floor); the **production Vercel-region measurement is the authoritative
  cold-path figure** and is an outstanding operator row (R5).
- **B3**'s structural sensitivity is itself a budget condition: production shadow-billing must
  establish the real `P` and confirm calls/tenant/day ≤ 50k (SPIKE-01's stated follow-up). At
  `P = 10`, ~518k calls/tenant/month ⇒ ~$1k/month platform-wide at 1k tenants for `findByDomain`
  alone — cost review accompanies the `P` measurement.
- **B4–B6** define "soak green": both windows elapsed, the per-tenant sample floor met, and every
  `cmsReadDivergence` row either absent or root-caused as expected (e.g. a deliberate content edit
  mid-soak) and signed off in writing. One unexplained divergence = soak red = no flip.

---

## 3. Gate status — runnable-in-sandbox gates RUN 2026-06-11

Every gate that can run in this sandbox was re-run for this rehearsal; commands and results are
verbatim. (Vitest invoked per-package via its resolved JS entry; equivalent to `pnpm test
--project <pkg>` filtered to the named files.)

| Gate | Command (cwd) | Result |
| --- | --- | --- |
| **Rehearsal + parity (this task)** | `vitest run src/cutover-rehearsal.test.ts` (packages/test-convex) | **2 passed** — GO + drift-NO-GO recorded in §1 |
| Rehearsal driver unit suite | `vitest run --config scripts/vitest.config.ts etl/rehearsal/run.test.ts` (repo root) | **7 passed** |
| **PIPELINE-04 dual-path parity** | `vitest run src/reconcile-parity.test.ts` (packages/test-convex) | **3 passed** |
| PIPELINE-04 in-Convex sweep | `vitest run convex/reconcile.test.ts` + `convex/revalidate` (packages/convex) | **39 passed** (7 files, includes G3 suites) |
| **G-RICH (in-repo corpus)** | `tsx --tsconfig scripts/tsconfig.json scripts/richtext-fidelity-check.ts` | **PASS, exit 0** — documents=77 fields=123, semantic diffs: 0, quarantined: 0 |
| G-RICH gate self-tests | `vitest run --config scripts/vitest.config.ts richtext-fidelity-check.test.ts` | **8 passed** |
| **G1 (RLS deny-default + total coverage)** | `vitest run convex/__tests__/rls-deny-default.test.ts convex/__tests__/system-escape-hatch.test.ts` (packages/convex) | **12 passed** |
| **G4 — both halves** (header depth-6 + pages blocks) | `vitest run src/lib/header-editor-gate.test.tsx src/lib/pages-editor-gate.test.tsx` (apps/admin) | **9 passed** |
| **SFREAD-13 build-call budget** | `vitest run 'src/app/[domain]/build-call-budget.test.ts'` (apps/storefront) | **5 passed** (formula-exact count, catalog-size independence, long-tail ISR posture) |
| **G2 (rollback net)** | — | **NOT RUNNABLE** — is CUTOVER-02 (wave 13). Blocking precondition for any flip; see §4 R1 |

---

## 4. Go/no-go checklist — the OPERATOR signs

Rules of engagement: work top to bottom; **every box must be checked before the CUTOVER-03 freeze
is scheduled**; a red row at any point is a full stop (fix, then restart the dependent rows). The
flip past CUTOVER-03 is irreversible by design — recovery is the G2 net, never a flag-back.

### Pre-flip, in order

- [x] **P1 — Dress-rehearsal mechanics + parity (sandbox).** Driver-orchestrated full pipeline GREEN
      on the multi-tenant corpus, drift case reads NO-GO. *RUN 2026-06-11, §1 — GO.*
- [x] **P2 — PIPELINE-04 dual-path checksums green (both suites).** *RUN 2026-06-11, §3.*
- [x] **P3 — G1 RLS deny-default + total coverage.** *RUN 2026-06-11, §3.*
- [x] **P4 — G3 bridge (publish→revalidate durable, DLQ, cron self-heal).** *RUN 2026-06-11 within
      the packages/convex revalidate suites, §3.*
- [x] **P5 — G4 both halves (header depth-6 nav + pages blocks), zero `@payloadcms/*` on those
      paths.** *RUN 2026-06-11, §3.*
- [x] **P6 — G-RICH green over every corpus available in-repo.** *RUN 2026-06-11, §3.*
- [x] **P7 — Build fan-out cap pinned (SFREAD-13) and under B3.** *RUN 2026-06-11, §3.*
- [ ] **R1 — G2 rollback net (CUTOVER-02). OPERATOR/next wave.** Reverse-ETL Convex→Mongo to FULL
      per-collection checksum parity on a restore, OR the signed one-way-gate checklist; PLUS the
      final pre-flip Mongo cold backup taken and restore-verified. **Nothing irreversible starts
      before this row is green.**
- [ ] **R2 — Production-dump staging rehearsal. OPERATOR.** `mongoexport` the production backends →
      `tsx scripts/etl/import.ts --execute` against a staging Convex deployment → run the SAME
      driver/reconcile (`reconcile:run` with `scripts/etl/reconcile/checksum.ts` expectations) →
      parity GREEN with **production row counts** recorded per collection + per-phase wall-clock
      timings. Those timings size the freeze window (§1 formula). Any quarantined rich-text value or
      checksum mismatch = NO-GO.
- [ ] **R3 — G-RICH re-run vs the production dump. OPERATOR.** `tsx --tsconfig
      scripts/tsconfig.json scripts/richtext-fidelity-check.ts <dump-dir>` over the full production
      rich-text corpus: zero semantic diffs, zero unquarantined drops; report committed next to
      `richtext-fidelity-report.md`. Hard precondition of CUTOVER-04/05/06.
- [ ] **R4 — Per-tenant call ceiling confirmed in production (B3). OPERATOR.** Shadow-billing/usage
      dashboard establishes real `P`; calls/tenant/day ≤ 50k confirmed; cost reviewed at the
      measured `P`.
- [ ] **R5 — Production-region miss-path latency (B2 authoritative form). OPERATOR.** p50/p99 of
      `db/shops:byDomain` from the production Vercel region against the production Convex
      deployment recorded here; p99 ≤ 150 ms, p50 ≤ 40 ms warm.

### Flip + soak (CUTOVER-03 window onward)

- [ ] **S1 — Freeze sequence executed per runbooks.** Maintenance freeze → final export → outbox
      drain (`scripts/etl/outbox/runbook.md`) → full reconcile GREEN on the frozen snapshot →
      flip `DB_BACKEND_*=convex` → stop Mongo writes. Lowest-risk services first; canary tenant
      validated before the cohort.
- [ ] **S2 — Canary soak ≥ 24 h (B4).** Canary tenant on Convex authority; zero unexplained
      `cmsReadDivergence` rows; error rates nominal.
- [ ] **S3 — Cohort soak ≥ 72 h with ≥ 1,000 sampled reads/active tenant (B5).** Zero unexplained
      divergence (B6); sample counts recorded per tenant.
- [ ] **S4 — CMS content cutovers (CUTOVER-04 → 05 → 06)** each gated on SFREAD-12 divergence-clean
      for their collections, in cohort order.

### Sign-off

| Field | Value |
| --- | --- |
| Operator | _________________ |
| Date | _________________ |
| Verdict | GO / NO-GO |
| Missed budgets (if NO-GO) | _________________ |

---

## 5. Build-time fan-out budget (SFREAD-13)

**Hard per-build Convex call cap:**

```
calls(build + first crawl) <= 1 + N * (9 + B + 3L)
```

where `N` = live (non-demo) tenants, `B` = blogs/tenant, `L` = runtime
locales/tenant. The formula and its per-term constants live in
`apps/storefront/src/utils/build-budget.ts`
(`maxConvexCallsPerBuild`); the counting suite
`apps/storefront/src/app/[domain]/build-call-budget.test.ts` drives a full
synthetic build-plus-first-crawl cycle (root static-params batch → every nested
static-params warmer → first render of all sitemap/robots routes) and asserts
the count lands exactly on the formula and is **independent of catalog size**
(`M` products/collections/pages/articles never multiply Convex calls).

Per-term accounting (worst case, zero credit for render-pass `cache()` dedup):

| Surface | Convex calls |
| --- | --- |
| Root `[domain]/[locale]` static-params | 1 × `Shop.findAll` platform-wide (the per-shop `findByDomain` N+1 was removed) |
| Nested static-params per tenant (1 build locale) | 4 × `findByDomain` (products, collections, `[...slug]`, blogs) + `B` × `findByDomain` (articles) + 1 × CMS pages window |
| Sitemaps/robots per tenant (first crawl) | 3 × `findByDomain` (sitemap index, robots.txt, pages.xml) + 3`L` × `findByDomain` (products/collections/blogs sitemaps) + 1 × CMS pages window (pages.xml) |

**Against SPIKE-01's ≤ 50k calls/tenant/day ceiling:** at `B = 3`, `L = 5` a
build costs 27 calls/tenant; at the assumed ≤ 5 builds/day that is ≤ 135
calls/tenant/day from build fan-out — under 0.3% of the ceiling, leaving the
budget dominated by the request-path terms SPIKE-01 already models.

**Long tail = ISR, not build enumeration:** the products warmer pre-renders only
`PREBUILT_PRODUCT_COUNT = 10` handles per tenant; no route segment under
`apps/storefront/src/app` sets `dynamicParams` (Next.js default `true` —
pinned by the `long-tail ISR posture` test in the counting suite), so any param
outside the warm set renders on first request instead of inflating the build.

**Shadow batching:** the SFREAD-12 dual-read shadow fires per **getter call**,
not per entry. A 1000-page pages.xml render or `[...slug]` warm-up is one
`PagesApi` window → at most ONE `cms/read:pages` shadow comparison, deferred via
`after()` off the render path (pinned by the `PagesApi shadow batching` test in
`apps/storefront/src/api/page.test.ts`). Shopify-backed enumerations
(products/collections/blogs/articles) bill nothing against Convex.
