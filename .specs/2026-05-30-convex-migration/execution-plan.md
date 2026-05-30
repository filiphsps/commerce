# Mongo → Convex Migration — Fan-Out Execution Plan (Option B)

How a fan-out execution workflow runs the 116 tasks in [`tasks.md`](./tasks.md) / [`tasks.json`](./tasks.json) across many agents in parallel waves, with verification gates between waves.

**Baseline.** FULL Option B (Payload dropped, CMS rebuilt on Convex). **ZERO temporary Mongo — never two authoritative databases at any point.** The plan-Phase-8 dual-write cutover is REPLACED by a one-shot freeze→export→drain→flip (see the CUTOVER track + Gate G2 below).

- **Total tasks:** 116 across 15 tracks
- **Waves:** 21
- **Recommended peak concurrency:** ~8 agents (Wave 7 has 13 runnable tasks but the chokepoints cap useful parallelism at ~8; see "Concurrency" below)
- **Worktree-isolated tasks:** 43 (listed under "Worktree isolation")
- **Post-review kill-gates:** `SPIKE-01` (wave 2, **G-SPIKE** — findByDomain latency + Convex cost feasibility, before any heavy build) and `CMSRICH-03` (wave 11, **G-RICH** — Lexical→ProseMirror full-corpus fidelity, before any CMS content cutover)
- **Post-review splits (sizing/auth honesty):** media → `CMSMEDIA-01/02/03`, rich-text → `CMSRICH-02` (renderer) + `CMSRICH-04` (codec), auth → `CONVEXCORE-14` (identity) + `CONVEXCORE-16` (admin shopId resolver). **Task count ≠ effort** — the CMS cluster (~31 tasks) is the ~quarter long pole; see [`tasks.md`](./tasks.md) "Effort is not uniform."

---

## Critical path (longest dependency chain — 20 nodes)

```
UNIFY-01  →  UNIFY-03  →  UNIFY-11  →  CONVEXCORE-04  →  CONVEXCORE-06  →  CONVEXCORE-07
   →  CMSDATA-03  →  CMSDATA-04  →  CMSDATA-05  →  CMSDATA-06  →  CMSDATA-07
   →  CMSGATE-01  →  CUTOVER-04  →  CUTOVER-05  →  CUTOVER-06
   →  TEARDOWN-02  →  TEARDOWN-04  →  TEARDOWN-05  →  TEARDOWN-07  →  TEARDOWN-09
```

The pacing spine is **Phase-0 unification → Convex RLS core → the CMS access+editor stack → the form-engine parity gates → the per-cohort coordinated CMS cutover → Payload removal → mongoose-major removal → final gate.** The CMS editor rebuild (CMSDATA-03→07) and the parity gates (CMSGATE) are the long pole the judge panel flagged; nothing downstream of them can start until they pass. The teardown tail is strictly serial by removal order.

Parallel near-critical chains that frequently co-bind the schedule:
- **Bridge spine:** BRIDGE-03 → BRIDGE-05 → BRIDGE-12 → CUTOVER-04 (publish revalidation must work before any CMS cutover).
- **ETL spine:** PIPELINE-01 → PIPELINE-02 → PIPELINE-04 → PIPELINE-05 → CUTOVER-03 (deterministic transform + reconcile + outbox before the storefront flip).
- **Rich-text lockstep:** CMSRICH-01 → CMSRICH-02 → CMSRICH-03 → CUTOVER-04 (zero-loss Lexical→ProseMirror round-trip **gates** content cutover; also feeds PIPELINE-02, HARNESS-12, SFREAD-12).
- **Early kill-gate (off-critical but blocks the build):** CONVEXCORE-01 → **SPIKE-01** → {CONVEXCORE-04, SFREAD-03, CMSDATA-01} — proves findByDomain latency + Convex cost in days, before the heavy Convex/CMS investment commits.

---

## Wave schedule

Each wave = the set of task ids whose predecessors are all in earlier waves. A wave may start only after the **gate** at the end of the prior wave passes (gates below). Counts in parentheses.

| Wave | Tasks | Rationale |
|---|---|---|
| **1** (9) | UNIFY-01, UNIFY-02, CONVEXCORE-01, CMSDESC-01, SFREAD-01, SFREAD-02, SFREAD-10, BRIDGE-01, HARNESS-01 | Zero-dependency starters fan out across every track: the Phase-0 spike GATE + CMS read-contract freeze, Convex package bootstrap, the field-descriptor DSL, the two read-contract freezes (11 getters + 6 db services), the surface classifier + zero-Convex-bundle CI gate, the bridge HMAC contract, the harness skeleton. |
| **2** (11) | **SPIKE-01**, UNIFY-03, UNIFY-06, CONVEXCORE-02, CONVEXCORE-03, CMSDESC-03, CMSDESC-04, CMSFORM-01, SFREAD-07, BRIDGE-02, BRIDGE-10 | Shape-defining work unlocked by the spike + freezes: **the findByDomain/cost feasibility kill-spike (SPIKE-01) — G-SPIKE must pass before any heavy-Convex investment**; tenant=shop collapse + reviews→shopId on Mongo; self-host backend + schema scaffold/validators; 13 collections + 9 blocks → descriptors; native form-state core; PPR-safe provider mount; the /api/revalidate/convex route + CSP origins. |
| **3** (11) | UNIFY-04, UNIFY-05, UNIFY-07, UNIFY-11, CONVEXCORE-05, CONVEXCORE-08, CMSDESC-02, CMSFORM-02, SFREAD-09, BRIDGE-03, HARNESS-02 | resolveTenantId-identity + attachShopSync delete + reviews-payload + collaborators de-embed; Convex auth/reviews tables + systemQuery hatch; the descriptor codegen freezing the read contract; scalar leaf widgets; PDP PPR-coexistence gate; in-Convex tag derivation; local-backend launcher. |
| **4** (6) | UNIFY-08, UNIFY-09, CONVEXCORE-04, CONVEXCORE-14, CMSFORM-03, BRIDGE-04 | Phase-0 idempotent backfill + seed glue; Convex shop-family tables (mirror the locked shape) + NextAuth→Convex auth integration; composite/recursive depth-6 widgets; bridge idempotency primitives. |
| **5** (6) | UNIFY-10, CONVEXCORE-06, CONVEXCORE-13, CMSFORM-04, BRIDGE-06, HARNESS-04 | **Phase-0 ship sign-off (GATE G0)**; fail-closed RLS rules; expand/contract deploy dry-run; blocks-field widget; notify action; Convex shop seed fixture. |
| **6** (5) | CONVEXCORE-07, BRIDGE-07, BRIDGE-09, HARNESS-05, PIPELINE-01 | tenantQuery/tenantMutation constructors (unblocks all Convex writes); durable delivery (action-retrier + DLQ); secret rotation; singleton/feature-flag seed fixtures; ETL core. |
| **7** (13) | CONVEXCORE-09, CONVEXCORE-11, CONVEXCORE-16, CMSFORM-05, CMSFORM-06, CMSDATA-01, CMSDATA-02, CMSDATA-03, CMSDATA-11, SFREAD-03, BRIDGE-08, HARNESS-03, PIPELINE-03 | With tenant wrappers live: barrel + subscription circuit-breaker; admin shopId resolver + auth.adapter.test; 2s autosave + data-bound pickers; drafts/versions, localization, access predicates, admin-list bounded pagination; re-home packages/db base; reconciliation cron; convex-test unit harness; cross-ref id-remap. |
| **8** (7) | CONVEXCORE-10, CMSDATA-04, CMSDATA-10, CMSRICH-01, SFREAD-05, SFREAD-06, BRIDGE-05 | Biome CI barrel gate; secret reject/strip + secret-exposure tests; _i18n shred / 1 MiB cap; ProseMirror rich-text storage+widget; Convex-back Shop/Review/FeatureFlag + User/Session/Identity read services; publish-mutation→scheduler wiring. |
| **9** (10) | CONVEXCORE-12, CMSMEDIA-01, CMSRICH-02, CMSRICH-04, CMSDATA-05, SFREAD-04, SFREAD-08, SFREAD-14, BRIDGE-12, HARNESS-09 | **Phase-2 RLS exit-criteria suite (GATE G1)**; media storage; ProseMirror storefront renderer + the lossless Lexical→ProseMirror codec; 7 editor actions on Convex; middleware findByDomain swap + benchmark; account/orders island; atomic shop write; **bridge Phase-4 exit gate (GATE G3)**; vitest mongoose-mock teardown. |
| **10** (7) | CONVEXCORE-15, CMSMEDIA-02, CMSDATA-06, CMSDATA-08, CMSDATA-12, PIPELINE-02, HARNESS-12 | Production Convex deploy provisioning; media derivatives (sharp 4 sizes + focal); EditorRuntime DI swap; publish→bridge tag feed; email path audit; ETL rich-text shred + _versions + media; rich-text-bearing seed fixtures. |
| **11** (7) | CMSDATA-07, **CMSRICH-03**, CMSMEDIA-03, PIPELINE-04, SFREAD-12, HARNESS-06, HARNESS-10 | Editor shell rebind; **the Lexical→ProseMirror full-corpus fidelity gate (CMSRICH-03) — G-RICH must pass before any CMS content cutover**; media CDN URLs + storefront image consumption; reconciliation checksum-parity + ledger; CMS-content dual-read shadow loader; canonical seed orchestrator; limit-boundary tests on the real backend. |
| **12** (9) | CMSGATE-01, CMSGATE-02, CMSDATA-09, SFREAD-11, SFREAD-13, PIPELINE-05, CUTOVER-01, HARNESS-07, HARNESS-08 | **HARD PARITY GATES (GATE G4)**: form engine end-to-end on header depth-6 + pages blocks; live preview bridge; prerender/use-cache audit; build fan-out cap; freeze-window outbox; cutover dress rehearsal + numeric budgets; both e2e global-setups → Convex. |
| **13** (1) | CUTOVER-02 | Reverse-ETL green OR one-way-gate sign-off + final pre-flip backup (**GATE G2** rollback net, proven BEFORE any irreversible flip). |
| **14** (2) | CUTOVER-03, CUTOVER-04 | One-shot storefront-services authority flip (freeze→export→drain→reconcile→flip→stop); CMS header+pages coordinated cutover (write+read together). |
| **15** (1) | CUTOVER-05 | CMS articles + product/collection-metadata cohort coordinated cutover. |
| **16** (1) | CUTOVER-06 | CMS footer/businessData + reviews/feature-flags/media cohort — removes the LAST Payload write path. |
| **17** (3) | TEARDOWN-00, TEARDOWN-02, TEARDOWN-03 | Final Mongo cold archive; full Payload application removal; delete @nordcom/commerce-test-mongo. |
| **18** (2) | TEARDOWN-01, TEARDOWN-04 | Kill live Mongo/MCP processes + scrub state; remove direct mongoose@9. |
| **19** (2) | TEARDOWN-05, TEARDOWN-06 | Remove db-mongodb adapter (kills transitive mongoose@8); delete scripts/*-mongo.ts + hooks atomically. |
| **20** (2) | TEARDOWN-07, TEARDOWN-08 | CI cleanup (ci.yml + both composite actions + env templates); docs/domain-knowledge rewrite + regenerate. |
| **21** (1) | TEARDOWN-09 | **Final ZERO-MONGO acceptance gate (GATE G5)**: clean dist rebuild, 18-command verification, MONGODB_URI= green, full DoD. |

---

## Verification gates between waves

A gate is a hard barrier: the orchestrator must verify the named condition green before dispatching the next dependent wave. These encode the critic's `ordering_risks` as explicit, machine-checkable gates (not `EXTERNAL:` prose).

| Gate | After wave | Blocks | Condition |
|---|---|---|---|
| **G-SPIKE — Feasibility kill-gate** | 2 (SPIKE-01) | CONVEXCORE-04, SFREAD-03, CMSDATA-01 (the first heavy-Convex-investment tasks) | findByDomain cold-miss p99 ≤ 150ms + warm p50 ≤ 40ms from Node middleware against a realistic-tenant Convex deployment; projected ≤ 50k calls/tenant/day incl build fan-out, cost model written. **NO-GO ⇒ halt the program before the build commits** (revisit datastore choice). Spike code discarded. |
| **G0 — Phase-0 ship** | 5 (UNIFY-10) | CONVEXCORE-04/05, PIPELINE-01, all Convex-schema mirroring | `pnpm build:packages && pnpm typecheck && pnpm test` + e2e seed green on the **unified Mongo schema**; attachShopSync gone; single shop==tenant record; reviews via shopId; collaborators join. The Convex schema mirrors this shape, never the 3-rep shape. |
| **G1 — Phase-2 RLS** | 9 (CONVEXCORE-12) | every tenant/system function consumer (CMSDATA-*, SFREAD-05/06, HARNESS-03) | deny-default proven (a no-rule table denies); cross-tenant read+write blocked; systemQuery reads the exempt tables; the Biome barrel gate (CONVEXCORE-10) is CI-blocking. |
| **G2 — Rollback net** | 13 (CUTOVER-02) | CUTOVER-03 + all CMS cutovers (04/05/06) | reverse-ETL to **full per-collection** checksum parity green (NOT a sample) OR the one-way-gate checklist signed; final pre-flip Mongo backup taken + restore-verified. No irreversible flip starts until G2 is green. |
| **G3 — Bridge Phase-4** | 9 (BRIDGE-12) | CUTOVER-04 (publish must invalidate before CMS cutover) | a Convex publish invalidates the Lane-1 tags; forced non-2xx → retry → DLQ; dropped event self-heals via cron; autosave triggers zero revalidation. |
| **G-RICH — Rich-text fidelity** | 11 (CMSRICH-03) | CUTOVER-04/05/06 (all CMS content cutovers) | every richtext doc (4 fields + rich-text block, all tenants) round-trips Lexical→ProseMirror with **zero semantic diff** in rendered storefront output; unconvertible nodes quarantined + reported, never silently dropped. **No content cutover with outstanding fidelity failures.** |
| **G4 — Form-engine parity (HARD)** | 12 (CMSGATE-01 + CMSGATE-02) | every CMS write cutover (CUTOVER-04/05/06) and Payload removal (TEARDOWN-02) | BOTH gates green end-to-end on header depth-6 nav + pages blocks (drafts/2s-autosave-no-clobber/versions/restore/localized/access/media/rich-text), zero `@payloadcms/*` on those paths. **Nothing migrates until both pass.** |
| **G5 — Zero-Mongo DoD** | 21 (TEARDOWN-09) | — (terminal) | all 18 verification commands pass; both mongoose majors + db-mongodb + MMS gone from the lockfile; `MONGODB_URI= pnpm build:packages && typecheck && test` green; no live mongod/MCP; `.mongo-dev/` + binary cache absent. |

### Structural pre-condition gates (enforced continuously, not at a single wave)

These come from critic ordering-risks #3 and #4 and must hold for **every** task that lands a Convex function or table:

- **Single function root.** All Convex functions live under `packages/convex/convex/**` (the CONVEXCORE-01 root). No task may create a second repo-root `convex/**` tree — that produces two deployment roots / duplicate `schema.ts` and will not compile as one deployment. The orchestrator should reject any diff adding `convex/` outside `packages/convex/`.
- **schema.ts is append-only via modules.** No task edits `packages/convex/convex/schema.ts` body directly. Every table-adding task (CONVEXCORE-04/05, CMSDATA-01/02/10, CMSMEDIA-01, CMSRICH-01, BRIDGE-04/07/08) adds an isolated `tables/<group>.ts` module that `schema.ts` spreads (CONVEXCORE-03's convention). This keeps parallel table-group tasks from colliding on one file.

---

## The three highest-risk ordering gates (operator summary)

1. **G4 — Form-engine parity (CMSGATE-01 + CMSGATE-02).** The judge panel's named long pole. In the raw tasks this was `EXTERNAL:` prose; here CUTOVER-04/05/06 and TEARDOWN-02 carry CMSGATE-01/02 (+ CMSDATA-05/06/07/08, BRIDGE-12) as **hard `depends_on`**. A fan-out orchestrator keying only on `depends_on` will now refuse to start any admin write cutover until both parity gates are green.
2. **G2 + the one-shot mandate (CUTOVER track).** The user's "zero temporary Mongo / never two authoritative databases" decision **replaces** plan Phase 8's dual-write/dual-read/canary-while-dual-writing chain. CUTOVER-01..06 are a single bounded freeze→export→drain→flip, with CUTOVER-02 (reverse-ETL/one-way gate + final backup) proven BEFORE the irreversible CUTOVER-03/04 flips. The CMS read-shadow (SFREAD-12) is a read-only parity comparison, not a second authoritative write store.
3. **Teardown ordering (TEARDOWN-00→09).** PROCESS/STATE FIRST (final archive → kill live mongod/daemon/MCP → scrub `.env.local`/`.mongo-dev`/binary cache) BEFORE any script deletion (the orphan reaper `clean-mongo.ts` is itself being deleted). Full Payload removal (TEARDOWN-02) precedes db-mongodb removal (TEARDOWN-05) which kills transitive mongoose@8; direct mongoose@9 (TEARDOWN-04) waits on packages/db-on-Convex (SFREAD-03/05/06) + e2e-off-mongoose (HARNESS-07/08/09). All four `EXTERNAL:` removal-order hazards are now real `depends_on` edges.

---

## Worktree isolation

Run these **43** tasks in isolated git worktrees (they edit files other in-wave siblings also touch, or are large isolated removals). Tasks not listed edit disjoint files and run in the shared tree.

```
SPIKE-01,
UNIFY-01, UNIFY-03, UNIFY-04, UNIFY-05, UNIFY-07, UNIFY-11,
CONVEXCORE-04, CONVEXCORE-05,
CMSDESC-03, CMSDESC-04,
CMSFORM-02, CMSFORM-03, CMSFORM-04, CMSFORM-05, CMSFORM-06,
CMSDATA-01, CMSDATA-02, CMSDATA-03, CMSDATA-04, CMSDATA-05, CMSDATA-06, CMSDATA-07, CMSDATA-09, CMSDATA-10, CMSDATA-11,
CMSRICH-01,
CMSGATE-01, CMSGATE-02,
SFREAD-03, SFREAD-05, SFREAD-06, SFREAD-14,
BRIDGE-04, BRIDGE-07, BRIDGE-08,
CUTOVER-02, CUTOVER-04, CUTOVER-05, CUTOVER-06,
TEARDOWN-02, TEARDOWN-07, TEARDOWN-08
```

Hotspots that force worktrees: `packages/convex/convex/tables/*` + `schema.ts` (table-group tasks), `packages/cms/src/editor/**` + `apps/admin/src/lib/**` (the editor rebuild chain CMSDATA-05/06/07), the CMS collection/block files (CMSDESC-03/04, CMSGATE), and the per-cohort cutover edits (CUTOVER-04/05/06 all touch `apps/admin/src/` + `packages/cms/src/editor/manifests/`).

---

## Concurrency

- **Recommended steady-state:** 6–8 agents. Waves 3, 7 and 9 are the widest (11–13 runnable), but the cross-wave gates and the editor-rebuild chokepoints (CMSDATA-06/07 `parallel_safe:false`) cap useful parallelism. More than ~8 agents idle against the critical path. **Caveat (sizing):** wide ≠ cheap — the CMS-cluster M tasks in waves 7–11 are the heaviest; see the effort callout in `tasks.md`.
- **Sequential singletons (`parallel_safe:false`).** Serialize these within their wave even if siblings are present: CONVEXCORE-01, UNIFY-08, UNIFY-10, CMSDATA-06, CMSDATA-07, SFREAD-03, SFREAD-11, BRIDGE-04, BRIDGE-05, BRIDGE-07, BRIDGE-08, BRIDGE-12, HARNESS-06, PIPELINE-05, CUTOVER-01, CUTOVER-03, TEARDOWN-00, TEARDOWN-01, TEARDOWN-03, TEARDOWN-04, TEARDOWN-05, TEARDOWN-06, TEARDOWN-09.
- **Tail collapse.** Waves 13–21 are mostly width-1–3 and almost entirely serial — a single careful operator (or one agent + reviewer) should own the cutover + teardown tail. Do not fan this out; the irreversibility (G2) and the process-kill ordering demand serialized, verified steps.
- **Track ownership heuristic.** Assign one agent per track for the broad early waves (UNIFY, CONVEXCORE, CMSDESC/CMSFORM, SFREAD, BRIDGE, HARNESS, PIPELINE run largely in parallel through wave ~9), then converge onto the CMS editor + gate chain, then a single owner for CUTOVER + TEARDOWN.

---

## Future execution Workflow sketch

A pipeline-over-waves / parallel-within-wave runner the orchestrator can drive directly from [`tasks.json`](./tasks.json):

```
load tasks.json
group tasks by `wave`  (waves are already a valid topological layering)

for wave in 1..21:
    runnable = tasks[wave]

    # structural pre-checks (continuous gates)
    assert no diff in the wave adds convex/ outside packages/convex/      # single function root
    assert no task in the wave edits packages/convex/convex/schema.ts body # table-module convention

    # dispatch
    parallel_group = [t for t in runnable if t.parallel_safe]
    serial_group   = [t for t in runnable if not t.parallel_safe]

    fan_out(parallel_group):          # one agent per task; up to max_concurrency (~8)
        if t.worktree: run in an isolated git worktree, then rebase onto the wave branch
        else:          run in the shared tree
        on_success: run t.acceptance checks; commit on green
        on_failure: park the task, surface to the operator (do NOT advance the wave)

    run_serial(serial_group)          # one at a time, same accept/commit discipline

    # wave gate (see table) — HARD BARRIER
    if wave == 2:  require Gate G-SPIKE (findByDomain latency + Convex cost feasibility)  # KILL-GATE before the build commits
    if wave == 5:  require Gate G0   (Phase-0 ship, on Mongo)
    if wave == 9:  require Gate G1   (Phase-2 RLS deny-default) AND Gate G3 (bridge Phase-4)
    if wave == 11: require Gate G-RICH (Lexical→ProseMirror full-corpus fidelity)         # before any CMS content cutover
    if wave == 12: require Gate G4   (form-engine parity, BOTH CMSGATE green)   # HARD
    if wave == 13: require Gate G2   (reverse-ETL/one-way gate + backup)        # before any flip
    if wave == 21: require Gate G5   (zero-Mongo DoD, all 18 commands)

    if gate fails: STOP the program, escalate; never auto-advance past a red gate
```

Key runner properties:
- **Per-wave fan-out, per-wave join.** All `parallel_safe` tasks in a wave run concurrently; the wave does not complete until every task's acceptance is green and any `parallel_safe:false` task has run serially.
- **Worktree merge discipline.** Worktree tasks rebase (never merge — repo convention) onto the wave integration branch before the gate; a failed rebase parks the task rather than advancing.
- **Gates are non-skippable.** G4 (form-engine parity) and G2 (rollback net) are the two that, if treated as advisory, corrupt state — the runner must treat a red gate as a full stop. **G-SPIKE** is the cheapest insurance: a red feasibility spike at wave 2 halts the program before the multi-quarter build, so honor it as a true kill-gate (revisit the datastore choice) rather than rationalizing past it. **G-RICH** prevents silent content loss — a red fidelity gate blocks every content cutover.
- **Idempotent re-entry.** Every cutover/ETL/teardown task is written idempotent (dry-run + re-run = no-op), so a parked-then-resumed wave never double-applies. The reconciliation ledger (PIPELINE-04) is the cross-wave source of truth for cutover parity.
- **Tail is operator-driven.** From Wave 13 the runner switches to single-step-with-confirmation: each CUTOVER/TEARDOWN step requires an explicit operator ack because the actions are irreversible (post-G2) or destructive (process kill, package deletion).
