# CUTOVER-03 — Storefront-services authority: the freeze→flip window (operator runbook)

The single bounded cutover window for the `packages/db` storefront services (`shops` + fan-out,
`featureFlags`, `reviews`, and the auth family `users`/`sessions`/`identities`). On this branch the
code authority is ALREADY Convex — the seam was re-homed at commit `31119ed2d` and there is no
backend flag: **deploying this branch IS the flip**, and there is structurally no flag-back (the
deployed code cannot reach Mongo; see §1). This runbook tells the operator exactly what to run
before, during, and after that deploy so Mongo is frozen, exported, drained, reconciled, and
retired without the two stores ever both accepting authoritative writes.

**This window runs BEFORE the CMS cohorts (CUTOVER-04 → 05 → 06).** Between this flip and the
cohorts, exactly one Mongo writer remains: Payload CMS authoring (pages, articles, headers,
footers, metadata, media, `payload-users`, `_*_versions`). That is safe because those collections
are **disjoint** from the services collections this window retires — the CMS freeze happens
per-cohort next, with its own outbox window per `scripts/etl/outbox/runbook.md`. §6 verifies the
disjointness holds live.

---

## 0. Hard preconditions — in order, all green before scheduling the window

1. **G2 (CUTOVER-02) signed.** The one-way gate `one-way-gate.md` §4 — reverse-ETL round-trip
   parity green over the production freeze-window export (row C1) and the final pre-flip cold
   backup plan ready (row C2 executes INSIDE this window, §3 step 5). **Nothing irreversible
   starts before G2 is green**; this is the recovery path (§7), never a flag-back.
2. **Go/no-go budgets green.** `cutover-budgets.md` §4: pre-flip rows P1–P7 are RUN-green
   (2026-06-11); operator rows R1–R5 (production-dump rehearsal R2, prod G-RICH R3, call ceiling
   R4, prod-region latency R5) completed and recorded there. The R2 timings size this window.
3. **Post-flip state verified in-repo (§1)** — the structural gates below are green at HEAD.
4. **Canary tenant chosen** and written down: its domain, its shop `legacyId`, and a logged-in
   operator account that is a collaborator on it.

## 1. Post-flip invariants — proven in-repo (cite these, do not re-derive)

What "the flip happened in code" means, and the committed proof for each claim:

| Invariant | Proof (committed suite / gate) |
| --- | --- |
| `packages/db` exposes ZERO Mongo write capability: no runtime mongoose/mongodb anywhere (mongoose survives as the SFREAD-02 **type** vocabulary only), and no Mongo driver in the runtime dependency surface | `packages/db/src/lib/mongo-free-runtime.test.ts` (source sweep + manifest check, with provable-failure negative cases) |
| Every seam write is exactly ONE Convex mutation (one serializable transaction) | `packages/db/src/lib/single-mutation-gate.test.ts` over every `src/services/*.ts` source |
| Session/identity/user paths are Convex-only and contract-frozen (NotFoundError/`[]` semantics, `db/sessions:*`, `db/identities:upsertByProviderIdentity`, `db/users:*` with the server secret attached) | `packages/db/src/services/identity-session-user.test.ts` (golden suite on the mocked `ConvexHttpClient`, the seam's only transport) |
| The admin Auth.js adapter runs on the Convex seam (not-found→null, infra-error→throw, no mongoose import) | `apps/admin/src/utils/auth.adapter.test.ts` (CONVEXCORE-16) |
| Storefront sessions never touch Mongo: Auth.js is JWT-strategy (cookie `NordcomCommerceSession`, no DB adapter); the Convex bridge token mints per-request | `apps/storefront/src/auth/auth.config.test.ts`, `apps/storefront/src/app/[domain]/api/auth/convex-token/route.test.ts` |
| Middleware pre-tenant routing resolves through Convex `shopDomains` | `packages/db` shop suite (`src/services/shop.test.ts`) + SFREAD-04 budget evidence in `cutover-budgets.md` §2 (B1/B2) |

Re-run the structural pair before the window (both must exit 0):

```sh
pnpm test --project @nordcom/commerce-db src/lib/mongo-free-runtime.test.ts src/lib/single-mutation-gate.test.ts
```

### What is NOT bulk-migrated (deliberate, lowest-risk-first)

The auth family is absent from the PIPELINE-01 export corpus (`scripts/etl/export.ts`
`SOURCE_COLLECTIONS = shops, featureFlags, reviews`) **by design**:

- **sessions** are disposable: the flip forces a re-login, which is also the window's first
  validation step (§4). Nothing references session ids externally.
- **users/identities** re-materialize on first OAuth sign-in through
  `db/identities:upsertByProviderIdentity` + the adapter's user create — the `(provider,
  identity)` natural key makes account re-link lossless (same guarantee the reverse-ETL relies on,
  `one-way-gate.md` §2).
- **shopCollaborators** carries `user: v.id('users')`, so the staged join rows cannot relink until
  the referenced user exists. Do not import that table in the bulk step; re-grant collaborators
  post-flip through the admin (`db/shop_write:upsertShop` delete-diff-syncs the join — the exact
  path `apps/admin/e2e/global-setup.ts` seeds with). Collaborator counts are small; capture the
  pre-flip grant list during the freeze export for the re-grant checklist.

## 2. Stopping admin writes — the freeze switch

There is no in-app maintenance toggle; the freeze switch is **platform-level: pause the admin
project in Vercel** (Dashboard → admin project → Settings → General → *Pause Project*; serves 503
`DEPLOYMENT_PAUSED`). Pausing the admin stops, atomically, every pre-flip services writer:

- Auth.js logins (Mongo `users`/`sessions`/`identities` writes via the pre-flip adapter),
- shop/settings edits and the shop-sync glue,
- Payload CMS authoring (also frozen for the duration of this window — announce it).

The storefront stays up throughout: its reads are Mongo-read-only pre-flip (the dual-read getters'
authoritative side) and its sessions are JWT cookies (§1) — it writes none of the frozen
collections. Verify that assumption live at freeze start with the oplog watch (§6 command, expect
only Payload namespaces to disappear after the pause).

Cron jobs, shells, and migration scripts are forbidden during the freeze, exactly as in
`scripts/etl/outbox/runbook.md` §6 — the parity gate is the backstop.

## 3. The bounded window, step by step

Numbered steps are strictly ordered; record start/end timestamps for each (the audit trail).

1. **Announce the freeze** (operators + any tenant-facing notice). Re-confirm §0 rows.
2. **Stop admin writes**: pause the admin project (§2). Record the pause timestamp `T_freeze`.
   - If the PIPELINE-05 outbox was running pre-freeze (`CONVEX_FREEZE_OUTBOX=1` hook pair live),
     leave it on — it has been capturing Payload-hooked writes and the drainer folds them next.
3. **Final export (PIPELINE-01)** — the frozen snapshot; immutable from this point:

   ```sh
   MONGODB_URI='…' ETL_OUT_DIR=./.etl pnpm tsx scripts/etl/export.ts
   pnpm tsx scripts/etl/import.ts                      # stage per-table JSONL (no Convex writes yet)
   pnpm tsx scripts/etl/import.ts --execute            # per-table `convex import --replace` + relink
   ```

   Skip `shopCollaborators` at import per §1. Also `mongoexport` the collaborator grant list and
   the auth-family collections into the same staging dir — not for import, but as the §1 re-grant
   checklist and the C1 reverse-ETL verification corpus (`one-way-gate.md` §4).
4. **Outbox drain to ≤ 60 s lag (PIPELINE-05)** — folds any freeze-window residue captured before
   `T_freeze` into the snapshot; the lag bound and the watch loop are
   `scripts/etl/outbox/runbook.md` §4 verbatim:

   ```sh
   pnpm tsx scripts/etl/outbox/drainer.ts --execute    # repeat until…
   pnpm tsx scripts/etl/outbox/drainer.ts              # …dry run reports: 0 undrained / lagMs=0
   ```

   The final dry run MUST report `lagMs=0` within 60 s of the last admin write. If it cannot, the
   freeze stays open — Mongo remains authoritative, nothing is half flipped.
5. **Final pre-flip cold backup** — `one-way-gate.md` §5 in full (dump → ship → restore-verify →
   record in C2). Taken here, after the drain, before the flip: the last-ever consistent Mongo
   state and the Phase-B/C rollback base.
6. **Reconcile to full parity (PIPELINE-04)** — the flip precondition:
   - the drain already wrote the folded expected side to `<staging>/convex/reconcile-expected.json`;
   - run `packages/convex/convex/reconcile.ts`'s `run` action against the production deployment
     with that file as `expected` (`packages/test-convex/src/reconcile-parity.test.ts` is the
     executable call-shape reference);
   - read back the `reconciliationLedger` rows for the run id: **0 mismatched collections** or the
     flip is NO-GO (fix → re-drain → re-verify; the freeze stays).
   - run the C1 reverse-ETL verification over the same corpus:
     `pnpm tsx scripts/etl/reverse/run.ts --verify ./.etl` → `GREEN`, exit 0.
7. **Deploy this branch — THE FLIP.** Merge `feat/convex-migration` (rebase, never merge-commit)
   and promote to production. Required production env on both apps before the deploy:
   `CONVEX_URL` (or `NEXT_PUBLIC_CONVEX_URL`), `CONVEX_SERVER_SECRET` (the server-trust seam fails
   closed without it), and the admin's RS256 operator-token keys. Mongo env stays set until
   TEARDOWN — the Payload surface still reads it.
8. **Verify — canary first, session/identity first** (§4, §5). Un-pause the admin only after the
   canary smoke passes.
9. **Stop/retire Mongo services writes** — confirm quiet oplog (§6). Archive the staging dir, the
   outbox collection, the reconcile ledger run id, and the oplog-quiet report as the cutover audit
   trail.
10. **Soak**: canary ≥ 24 h (B4), then full cohort ≥ 72 h with the B5 sample floor and B6
    zero-unexplained-divergence — `cutover-budgets.md` §2/§4 rows S2–S3. The first CMS cohort
    (CUTOVER-04) waits for the full C4–C6 bake in `one-way-gate.md` §4.

## 4. In-window validation order — lowest risk first

Session/identity is first BECAUSE it is the lowest-risk service: sessions were never bulk-migrated
(nothing to corrupt), a failure forces a re-login at worst, and success exercises the whole
Convex auth write path end-to-end. Then escalate:

1. **Session/identity (canary operator):** sign in to the un-paused admin with the canary
   operator account. Expect: OAuth completes; a `users` + `identities` + `sessions` row appears in
   the Convex dashboard (data → tables); no Mongo `sessions` write appears in the oplog watch.
2. **Identity re-link (second account):** sign in with a second pre-existing account — the
   `(provider, identity)` upsert must yield exactly one identity row (no duplicate).
3. **Shop reads (canary tenant):** storefront homepage + a product page on the canary domain
   return 200 with tenant-correct content (middleware `findByDomain` → Convex `shopDomains`).
4. **Shop write:** a no-op-grade settings edit on the canary shop through the admin; confirm the
   Convex `shops` row updates and the storefront reflects it after revalidate.
5. **Reviews + feature flags read** on the canary tenant (getters serve; counts match the
   reconcile ledger's expected counts).
6. Only after 1–5 pass on the canary: spot-check 2–3 cohort tenants (step 3's check), then declare
   the window's verify phase done and proceed to §6.

## 5. Post-deploy smoke list (the §3 step 8 checklist)

- **Middleware resolves:** `curl -sI https://<canary-domain>/` → 200 (or the locale redirect),
  and an unknown hostname still 404s (the not-found contract survived the seam).
- **Getters serve:** storefront canary pages render with live data; no
  `MissingEnvironmentVariableError('CONVEX_URL')` / `CONVEX_SERVER_SECRET` errors in function
  logs (those mean step 7's env was incomplete — fix env, redeploy; this is not a rollback).
- **Publish revalidates:** publish a trivial CMS draft on the canary tenant (Payload authoring is
  live again post-un-pause) and confirm the storefront page revalidates. Pre-CUTOVER-04 this
  exercises the Payload-side hook path; the Convex bridge (G3) takes over per-cohort later.
- **Auth round-trip:** §4 steps 1–2.
- **Divergence ledger:** `cmsReadDivergence` has zero new unexplained rows (the SFREAD-12 shadow
  keeps running; CMS reads are still Mongo-authoritative until the cohorts).

## 6. "Stop Mongo writes" — the oplog-quiet verification

Post-flip, writes to the six retired services collections must be ZERO while Payload keeps writing
its own namespaces. The committed checker (`scripts/etl/oplog-quiet.ts`, unit-proven by
`scripts/etl/oplog-quiet.test.ts`) exports an oplog window and classifies it: retired-collection
writes (`shops`, `featureFlags`/`feature-flags`, `reviews`, `users`, `sessions`, `identities` — in
any database) are violations (exit 1); Payload namespaces (`pages`, `_*_versions`,
`payload-users`, …) are reported informationally.

```sh
# After §4 passes; run against the production replica set (URI must target the `local` db):
MONGODB_OPLOG_URI='mongodb://…/local?authSource=admin' OPLOG_WINDOW_MINUTES=60 \
    pnpm tsx scripts/etl/oplog-quiet.ts
```

Required: exit 0 and the `QUIET` line, with the window covering everything since the un-pause.
Re-run daily during the soak. Any `VIOLATION` row = a surviving writer: identify it via the
namespace + wall time, stop it, and treat the soak clock as reset for that budget row.

**Known residual surface (why this check exists):** until TEARDOWN-02 the admin still mounts
Payload's REST/GraphQL routes (`apps/admin/src/app/(payload)/api/**`), and the Payload config still
registers `shops`, `reviews`, and `feature-flags` collections whose access rules would let an
admin-role principal write the retired Mongo collections through that surface. No application code
path calls it post-flip — but the oplog check is the mechanical detector that nothing (and nobody)
does. The `--all` mode is the later TEARDOWN posture: after CUTOVER-06 removes the last Payload
write path, any non-system write at all is a violation.

## 7. Recovery — the G2 paths, never a flag-back

There is no read/write backend flag for the services: the deployed code is Convex-only
(§1). Recovery is therefore exactly `one-way-gate.md` §3's phase table:

- **Before §3 step 7 (no deploy yet):** stand down. Un-pause the admin, discard the staging dir.
  Mongo was authoritative the whole time; nothing happened.
- **After the deploy (Phase B):** revert the production deployment to the pre-cutover branch state
  AND restore the core collections via the reverse-ETL
  (`pnpm tsx scripts/etl/reverse/run.ts --restore <convex-snapshot> …` over the §3-step-5 backup
  base; `one-way-gate.md` §1 restore semantics — wholesale `--drop`, restore order, forced
  re-login). Losses are bounded and pre-acknowledged in G2 §2 (minted ObjectIds for
  reviews/users/sessions/identities, active sessions).
- **Never** attempt a partial fallback (e.g. pointing one service back at Mongo): the code cannot
  do it, and split authority is the exact failure mode this design excludes.

## 8. Ordering constraints (binding)

1. **G2 first.** `one-way-gate.md` §4 signed before the freeze is scheduled (§0.1).
2. **Budgets go/no-go second.** `cutover-budgets.md` §4 all pre-flip rows green (§0.2).
3. **This window BEFORE the CMS cohorts.** CUTOVER-04/05/06 each additionally require the C4–C6
   soak/bake rows; in between, Payload CMS authoring is the sanctioned remaining Mongo writer on
   disjoint collections (§6 verifies the disjointness live).
4. **Within the window: session/identity → shop reads → shop writes → reviews/flags**, canary
   tenant before cohort (§4).
