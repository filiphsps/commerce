# G5 — Zero-Mongo Acceptance Gate (TEARDOWN-09) — executed 2026-06-11

**VERDICT: GREEN.** Every verification command below ran on this machine against
`feat/convex-migration` (post `f383e0c45`); every red it surfaced was fixed at root cause in the
separate sweep commit `f383e0c45` (`chore(teardown): sweep the final mongo-era remnants the g5 gate
surfaced.`) before the gate was declared. This document is the recorded Definition-of-Done for the
Mongo→Convex migration's terminal gate: each command, its real output, the sanctioned-remnant
allowlist it was judged against, the one pre-existing out-of-scope failure, the program gate
ledger, and the operator-outstanding list.

Companion: [`mongo-teardown-inventory.md`](./mongo-teardown-inventory.md) (the source of the
18-command shape), [`teardown-log.md`](./teardown-log.md) (TEARDOWN-00/01 process/state scrub).

---

## 0. Execution constraints & adaptations (read before re-running)

The inventory's command block assumed unconstrained full-graph runs. Three commands were adapted —
each adaptation is strictly equivalent or stricter per-surface, and the full-graph originals are
CI's standing job on every push (`.github/workflows/ci.yml` runs frozen install + build +
typecheck + test + the convex bundle guard on the real graph):

1. **`pnpm install --frozen-lockfile`** → ran as `pnpm install --frozen-lockfile --lockfile-only`
   (resolution-level proof; node_modules pruning is CI's job). The local `node_modules/.pnpm` store
   still carries orphaned `@payloadcms+*` directories from before the manifest removals — they are
   unreachable (nothing resolves them; `pnpm why` and the lockfile are both empty) and vanish on
   any fresh install.
2. **`MONGODB_URI= pnpm build:packages && pnpm typecheck && pnpm test`** → ran as a per-package
   bare `tsc -noEmit` sweep over all 21 workspace packages (+ the root `scripts/` tsconfig) and a
   per-project vitest sweep over all 21 vitest projects (+ the standalone `scripts` project), each
   with `MONGODB_URI=` blank, invoking the `tsc`/`vitest` binaries directly.
3. **Why binaries instead of `pnpm test --project …`:** any `pnpm run` in this tree triggers
   pnpm's `verify-deps-before-run` → `pnpm install` → `postinstall` → `build:packages`, which dies
   on the **pre-existing, migration-unrelated** `react-payment-brand-icons#build` breakage (§4)
   before the requested command starts. The vitest runs used
   `./node_modules/.bin/dotenv -c -- node <vitest> run --project <name> --coverage.enabled=false`
   — the same env-loading + project selection as the package script, minus the broken wrapper.

`packages/convex/.env.local` stayed pinned to `dev:colorful-aardvark-6` throughout. No Convex
schema/function signature changed in this task, so `convex/_generated` is untouched (verified by
the clean tree, §2.18).

---

## 1. Sanctioned-remnant allowlist

The greps below are judged against this exhaustive allowlist. Anything matching a Mongo/Payload
token and **not** on this list was treated as red and fixed.

| Surface | Why it stays |
|---|---|
| `.specs/**` | Append-only program history (excluded by the gate definition). |
| `apps/docs/content/**`, `apps/docs/api/**` | Generated docs tree; self-heals via `pnpm gen`. |
| `scripts/etl/**` | The prod-cutover ETL. Reads **mongoexport files** (no mongoose import anywhere under it); `export.ts`/`oplog-quiet.ts` legitimately read `MONGODB_URI`/`MONGODB_OPLOG_URI` at run time on the ops box. Survives by design until the prod cutover completes. |
| `scripts/richtext-fidelity-check.{ts,test.ts}` | The G-RICH corpus gate; its cutover-time input is the production mongoexport dump directory. Survives with the ETL. |
| `packages/db/src/lib/mongo-free-runtime.{ts,test.ts}` | The zero-Mongo **runtime gate itself** (manifest + module-reference checker); its strings are the detector, not a dependency. |
| `packages/db/src/models/query-types.ts`, `models/shop.ts:103`, `services/service-seam-contract.snapshot.ts:1` | The TEARDOWN-04 frozen-seam vocabulary: local structural stand-ins for the retired mongoose query types, plus the sanctioned snapshot amendment comment (import-source-only change, pinned signatures byte-identical). |
| `legacyId` lineage prose (`packages/convex/convex/{tables,db}/*`, `packages/db/src/{db,lib/doc-to-shape,models/*}`, `packages/test-convex/src/seed/**`, `apps/admin` row-id comments, `packages/db/src/services/shop.test.ts:118` test title) | `shops.legacyId` **preserves the migrated Mongo `ObjectId` string as the PUBLIC shop id** — externally persisted; the comments documenting that provenance are load-bearing domain knowledge. |
| `packages/test-convex/src/{cutover-rehearsal,reconcile-parity}.test.ts`, `unit.ts:47` | The mongoexport-extended-JSON parity/rehearsal corpus (the ETL's unit-level proof) + one lineage comment. |
| `CONTEXT.md:278` | The deliberate TEARDOWN-08 glossary entry explaining the historical 3-store shop representation **as historical** — exists precisely so future agents don't re-learn it. |
| `apps/storefront/docs/overview.mdx:55` | Documents that `@payloadcms/*`/`payload` were "removed entirely with the Convex migration". |
| `packages/cms/scripts/codegen/emit-content-types.ts:13` | The descriptor codegen that **replaced** the Payload typegen; the comment records the `payload-types.ts` → `content-types.ts` rename. |
| `.claude/settings.json:87` (`"mongodb@claude-plugins-official": false`) | **Disables** the MongoDB plugin/MCP wiring — the removal record for inventory trap #18. |
| `packages/shopify-graphql/storefront.schema.json` | Vendored Shopify introspection schema; matches only as `Mongolia`/`Mongolian` (country enum descriptions). False positive, like `among`. |

---

## 2. The verification commands — real output

### 2.1 Tracked-source token grep (mongo family)

```
$ git grep -InE 'mongo|mongoose|MONGODB_URI|MONGOMS|wiredTiger|replSet' \
    -- ':!pnpm-lock.yaml' ':!.specs/*' ':!apps/docs/*' ':!scripts/etl/*' \
       ':!scripts/richtext-fidelity-check*' ':!packages/db/src/lib/mongo-free-runtime*' \
  | grep -v -iE 'among|monger'
.claude/settings.json:87:    "mongodb@claude-plugins-official": false,
packages/db/src/models/query-types.ts:4: * TEARDOWN-04 removed `mongoose` from the dependency graph, …
packages/db/src/models/shop.ts:103: * unpopulated-ref arm of the union (now the structural `LegacyObjectIdRef`, since the mongoose
packages/db/src/services/service-seam-contract.snapshot.ts:1:// TEARDOWN-04 amendment: `mongoose` left the dependency graph, …
packages/test-convex/src/cutover-rehearsal.test.ts:56:/** A mongoexport extended-JSON date. */
packages/test-convex/src/reconcile-parity.test.ts:40:/** The export-shape (mongoexport extended JSON) source corpus … */
packages/test-convex/src/unit.ts:47: * mongoose mocks the Mongo tier relied on.
```

7 hits, all on the §1 allowlist. A stricter **case-insensitive** pass (catching capital-M `Mongo`
prose) over the same scope, filtered to **non-comment** lines, leaves exactly two: `CONTEXT.md:278`
(glossary historical entry) and `packages/db/src/services/shop.test.ts:118` (a test title for the
legacyId projection) — both allowlisted prose. Zero imports, identifiers, or config values.

### 2.2 ObjectId grep

```
$ git grep -In 'ObjectId' -- ':!pnpm-lock.yaml' ':!.specs/*' ':!apps/docs/*' \
    ':!scripts/etl/*' ':!scripts/richtext-fidelity-check*' ':!packages/db/src/lib/mongo-free-runtime*'
→ 22 hits in 13 files
```

Every hit is `legacyId`-lineage documentation or the frozen `LegacyObjectIdRef` structural type
(§1). No `bson`/driver `ObjectId` import or runtime construction exists anywhere.

### 2.3 Payload surface grep

```
$ git grep -InE "mongooseAdapter|@payloadcms|payload-types|getAuthedPayloadCtx|get-payload-instance|seedPayloadPrincipal|from 'payload'" \
    -- apps packages ':!apps/docs/*'
apps/storefront/docs/overview.mdx:55:- `@payloadcms/*` and `payload` — removed entirely with the Convex migration
packages/cms/scripts/codegen/emit-content-types.ts:13: * Payload runtime, and the generated file moved from `payload-types.ts` to
```

2 hits, both allowlisted removal-record prose. (Before the sweep commit this grep returned 7 —
the other 5 were stale config/comments, fixed in §3.)

### 2.4 test-mongo package + referrers

```
$ git ls-files packages/test-mongo | wc -l                                  → 0
$ git grep -In '@nordcom/commerce-test-mongo' -- ':!pnpm-lock.yaml' ':!.specs/*' | wc -l   → 0
```

### 2.5 Tenant-bridge read path

```
$ git ls-files packages/cms/src/api/resolve-tenant-id.ts | wc -l            → 0
$ git grep -In 'resolveTenantId' -- apps packages | wc -l                   → 0
```

### 2.6 Lockfile assertions

```
$ for t in mongoose mongodb bson saslprep mongodb-memory-server mongodb-connection-string-url '@payloadcms' 'payload:'; do
    printf '%s: ' "$t"; grep -cE "$t" pnpm-lock.yaml; done
mongoose: 0   mongodb: 0   bson: 0   saslprep: 0
mongodb-memory-server: 0   mongodb-connection-string-url: 0
@payloadcms: 0   payload:: 0
```

Both mongoose majors (direct 9.x and the Payload-transitive 8.x tree), both mongodb drivers, bson,
saslprep, MMS, and the entire `@payloadcms`/`payload` family are gone from the lockfile.

### 2.7 pnpm why (dependency graph)

```
$ pnpm why -r <p>   for p in mongoose mongodb bson mongodb-memory-server \
    @payloadcms/db-mongodb @mongodb-js/saslprep mongodb-connection-string-url payload
→ every invocation: no output (no packages found)
```

### 2.8 Frozen lockfile resolution

```
$ pnpm install --frozen-lockfile --lockfile-only
Scope: all 22 workspace projects
Done in 431ms using pnpm v11.4.0
EXIT=0
```

(Resolution-level proof; the full `--frozen-lockfile` node_modules install is CI's first step on
every push.)

### 2.9 Workspace manifest

```
$ grep -n 'mongodb-memory-server' pnpm-workspace.yaml                       → (empty) EXIT=1
```

### 2.10 Env templates, live env, turbo, gitignore

```
$ grep -RnE 'MONGODB_URI|MONGODB_URI_TEST|MONGOMS' .env.example apps/storefront/.env.example \
    apps/admin/.env.example .env.local                                      → (empty) EXIT=1
$ grep -n 'MONGO' turbo.json                                                → (empty) EXIT=1
$ grep -n 'mongo' .gitignore                                                → (empty) EXIT=1
```

### 2.11 CI workflow + both shared composite actions

```
$ git grep -InE 'MONGOMS|mongodb-binaries|mongo-binary-cache-hit|save-mongo-binary|MONGODB_URI' -- .github
→ (empty) EXIT=1
```

Covers `ci.yml` AND `.github/common/bootstrap/action.yml` + `bootstrap-save/action.yml` (shared by
deploy/release/docs).

### 2.12 Live processes

```
$ pgrep -fl mongod          → (empty) EXIT=1
$ pgrep -fl mongo-daemon    → (empty) EXIT=1
$ pgrep -fl mongodb-mcp     → (empty) EXIT=1
$ pgrep -fl mongo_killer    → (empty) EXIT=1
```

### 2.13 Machine state

```
$ test -d .mongo-dev                                  → OK .mongo-dev gone
$ test -d ~/.cache/mongodb-binaries                   → OK binary cache gone
$ test -d node_modules/.cache/mongodb-memory-server   → OK MMS nm cache gone
$ env | grep -c '^MONGOMS_'                           → 0
```

(The kill/scrub itself was TEARDOWN-00/01, recorded with before/after evidence in
[`teardown-log.md`](./teardown-log.md).)

### 2.14 Compiled dist scan (what the apps actually import)

```
$ find packages -path '*/dist/*' \( -name '*.js' -o -name '*.mjs' -o -name '*.cjs' \) \
    -not -path '*/node_modules/*' \
  | xargs grep -lE "require\(['\"]mongoose|from ?['\"]mongoose|mongooseAdapter|@payloadcms"
→ (empty) EXIT=1
```

Zero compiled mongoose/Payload in any `packages/*/dist` tree, including `packages/db/dist` and
`packages/cms/dist`. (The inventory's "purge all caches + full `pnpm build:packages` rebuild" is
CI's standing job; locally the on-disk dist the apps import is already clean.)

### 2.15 Per-package bare tsc sweep — `MONGODB_URI=` blank — 22/22 green

```
$ (cd <pkg> && MONGODB_URI= node <tsc> -noEmit)   for every workspace package:
packages/cms 0 · packages/convex 0 · packages/db 0 · packages/errors 0 ·
packages/marketing-common 0 · packages/react-payment-brand-icons 0 ·
packages/shopify-graphql 0 · packages/shopify-html 0 · packages/test-convex 0 ·
packages/utils 0 · packages/tagtree/{core,next,shopify} 0 0 0 ·
packages/cart/{core,next,react,shopify} 0 0 0 0 ·
apps/admin 0 · apps/docs 0 · apps/landing 0 · apps/storefront 0 ·
scripts/ (root tsconfig) 0
```

All EXIT=0. Note the stale-node_modules caveat: tsc green alone would not prove mongoose left the
graph — the import-level proof is the greps (2.1/2.3) + lockfile (2.6) + `pnpm why` (2.7).

### 2.16 Per-project vitest sweep — 21 projects + standalone scripts project

```
$ ./node_modules/.bin/dotenv -c -- node <vitest> run --project <name> --coverage.enabled=false
@nordcom/commerce-errors        EXIT=0   61 passed
@nordcom/commerce-utils         EXIT=0   73 passed
@nordcom/commerce-marketing-common EXIT=0  2 passed
react-payment-brand-icons       EXIT=1   468 failed | 54 passed   ← PRE-EXISTING, out of scope (§4)
@nordcom/commerce-shopify-graphql EXIT=0  7 passed
@nordcom/commerce-shopify-html  EXIT=0   28 passed
@tagtree/core                   EXIT=0   58 passed
@tagtree/next                   EXIT=0    4 passed
@tagtree/shopify                EXIT=0   11 passed
@nordcom/cart-core              EXIT=0   43 passed
@nordcom/cart-next              EXIT=0   22 passed
@nordcom/cart-react             EXIT=0   25 passed
@nordcom/cart-shopify           EXIT=0   21 passed
@nordcom/commerce-db            EXIT=0   266 passed | 3 skipped
@nordcom/commerce-cms           EXIT=0   452 passed
@nordcom/commerce-convex        EXIT=0   282 passed
@nordcom/commerce-test-convex   EXIT=0   35 passed | 8 skipped (live-backend suites env-gated)
@nordcom/commerce-docs          EXIT=0   37 passed
@nordcom/commerce-landing       EXIT=0   (single config-level test file; no unit suite)
@nordcom/commerce-admin         EXIT=0   232 passed | 1 todo
@nordcom/commerce-storefront    EXIT=0   1128 passed | 1 skipped

$ node <vitest> run --config scripts/vitest.config.ts        (standalone scripts project)
Test Files  17 passed (17) · Tests  163 passed (163) · EXIT=0
```

Before the sweep commit, the scripts project was `3 failed | 17 passed` — the three
`migrate-1-*.test.ts` files died at collection with `ERR_MODULE_NOT_FOUND: Cannot find package
'mongoose'`. Root cause + fix in §3.1. cms/convex/admin/storefront were re-run green after the
last comment/config edits.

### 2.17 `MONGODB_URI=` explicitly-blank full re-run — db / cms / admin / storefront

```
MONGODB_URI= … --project @nordcom/commerce-db          EXIT=0   266 passed | 3 skipped
MONGODB_URI= … --project @nordcom/commerce-cms         EXIT=0   452 passed
MONGODB_URI= … --project @nordcom/commerce-admin       EXIT=0   232 passed | 1 todo
MONGODB_URI= … --project @nordcom/commerce-storefront  EXIT=0   1128 passed | 1 skipped
```

No hidden default, stub, or vitest `stubEnv` resurrects a Mongo connection string anywhere in the
four packages that ever read one.

### 2.18 CMS codegen drift gate + clean tree

```
$ (cd packages/cms && node <tsx> scripts/cms-gen-check.ts)    → EXIT=0
```

`cms:gen:check` passes with no Mongo adapter and no hardcoded `generate-types-only` URI — the
descriptor codegen emits `src/types/content-types.ts`; the Payload typegen path no longer exists.
`git status` after the gate-doc commit: only the standing untracked allowances
(`.specs/*.workflow.js`, `apps/docs/content/packages/{convex,test-convex}/`). `convex/_generated`
untouched.

---

## 3. Reds surfaced by this gate — fixed at root cause (commit `f383e0c45`)

1. **`scripts/migrate-1-{unify-shop-tenant,reviews-shopid,collaborators-join}.{ts,test.ts}` —
   DELETED.** The Phase-0 (UNIFY-08, gate G0) idempotent in-place Mongo backfills. Their purpose
   completed before the cutover (the ETL transform consumes "the Phase-0 unified-shape
   collections" — `scripts/etl/transform/index.ts` — and the prod runbook sequence
   `storefront-cutover-runbook.md` §3 runs export→import→drain with **no** migration-1 step; the
   file-side remap convention they pioneered is re-implemented in `scripts/etl/transform/id-remap`
   + `etl/remap/references`, which only *cites* them). Their top-level `import mongoose` stopped
   resolving when TEARDOWN-04 removed the dependency, making their tests the only red in the
   scripts vitest project. History preserved in git + `.specs/`.
2. **Stale rolldown externals** `external: ['mongoose','mongodb']` in
   `packages/{utils,marketing-common}/vite.config.ts` — removed (inert once no module imports
   them; the shared `packages/vite.config.ts` externals don't include them).
3. **`packages/cms/turbo.json`** `generate.outputs` and **`packages/cms/vitest.config.ts`**
   coverage exclude still pointed at the retired `src/types/payload-types.ts` — re-pointed to the
   descriptor-emitted `src/types/content-types.ts`.
4. **`packages/convex/tsconfig.json`** carried a `paths` pin of `@nordcom/commerce-cms/types` to
   the built `.d.ts`, with a rationale (`declare module 'payload'` augmentation in the source
   types) that died with the Payload typegen. Pin removed; bare tsc verified green resolving the
   augmentation-free source both before and after.
5. **Stale pre-cutover narration** rewritten to Convex-era truth:
   `apps/storefront/e2e/global-setup.ts` (dual-read/`predev-mongo` paragraph deleted),
   `search.regression.test.ts` (MONGODB_URI rationale → `server-only` Convex seam),
   `accepted-payment-methods.tsx` (mongoose-`.exec()` PPR note → Convex-backed read),
   `apps/storefront/src/api/shopify.ts:13` ("single Mongo round-trip" → backend),
   `packages/convex/convex/lib/auth.ts` + `apps/admin/src/lib/cms-ctx.ts`
   (`getAuthedPayloadCtx` references → `getAuthedCmsCtx`).
6. **Mongo-flavored test fixtures** renamed: `'mongo timeout'` → `'upstream timeout'`
   (convex-token route test), `'MongoNetworkTimeoutError'` → `'NetworkTimeoutError'` (revalidate
   route test), `'shop_mongo_legacy'` → `'shop_legacy_public_id'` (convex cms read test).

Every touched package re-verified: bare tsc EXIT=0, owning vitest projects re-run green, Biome
clean on all touched files.

## 4. Out-of-scope pre-existing red (recorded, NOT silently fixed)

**`react-payment-brand-icons`** — build AND 2 test files (468 assertions) fail with
`Unexpected JSX expression` / "Failed to parse source for import analysis" on
`src/generated/icons/*.js`: the generated icon modules contain JSX in `.js` files, which
vite 8.0.14/rolldown no longer transforms. Evidence it predates this program:
`git log master..HEAD -- packages/react-payment-brand-icons` is **empty** (the branch never
touched the package); the breakage arrived with master-side dep bumps (vite 8 / rolldown / vitest 4,
commits `afa5a319d`/`6b1371f37` lineage). It was already recorded as pre-existing in
`teardown-log.md` §2 on 2026-06-11. Knock-on: it breaks `pnpm run`'s verify-deps postinstall chain
repo-wide (§0.3). Zero Mongo/Payload involvement — the package's own tsc is green and its
generator tests (54) pass. Fix belongs to a dedicated task (emit `.jsx`, or restore a JSX
transform for `.js` in that package's vite config).

## 5. Program gate ledger — all green, with artifacts

| Gate | What it proved | Artifact |
|---|---|---|
| **G-SPIKE** | findByDomain latency + Convex cost feasibility before any heavy build | [`spike-01-findbydomain-feasibility.md`](./spike-01-findbydomain-feasibility.md), [`phase0-tenantslug-spike.md`](./phase0-tenantslug-spike.md) |
| **G0** | Phase-0 ship on the unified Mongo schema (tenant=shop, reviews→shopId, collaborators join) | [`phase0-verification.md`](./phase0-verification.md) |
| **G1** | RLS deny-default + system escape hatch | `packages/convex/convex/__tests__/rls-deny-default.test.ts`, `__tests__/system-escape-hatch.test.ts` (green in §2.16) |
| **G2** | Rollback net: reverse-ETL round-trip / one-way gate + final backup discipline | [`one-way-gate.md`](./one-way-gate.md), `scripts/etl/reverse/**` (green in §2.16 scripts project) |
| **G3** | Bridge Phase-4: publish→invalidate, retry/DLQ, cron self-heal | `packages/convex/convex/revalidate/**` + storefront revalidate route suites (green in §2.16) |
| **G-RICH** | Lexical→ProseMirror full-corpus fidelity, zero semantic loss | [`richtext-fidelity-report.md`](./richtext-fidelity-report.md), `scripts/richtext-fidelity-check.{ts,test.ts}` |
| **G4** | Form-engine parity (header depth-6 + pages blocks) before any CMS write cutover | [`g4fix-03-localized-composite-groups.md`](./g4fix-03-localized-composite-groups.md), `apps/admin/e2e/{header-editor,pages-editor}.spec.ts`, [`sfread-11-rsc-convex-read-audit.md`](./sfread-11-rsc-convex-read-audit.md) |
| **G5** | Zero Mongo, zero Payload, Convex-only | **this document** + [`teardown-log.md`](./teardown-log.md) |

## 6. Operator-outstanding (the repo side is DONE; these are ops-side, in run order)

1. **Prod Convex provisioning** — production deployment, env, auth config:
   [`convex-prod-provisioning.md`](./convex-prod-provisioning.md).
2. **Vercel env** — `CONVEX_URL`/`NEXT_PUBLIC_CONVEX_URL`/`CONVEX_SERVER_SECRET`/deploy key in the
   Vercel project settings (out of repo by design, inventory §E):
   [`convex-prod-provisioning.md`](./convex-prod-provisioning.md) + cutover runbook §2 prereqs.
3. **Prod final Mongo cold backup** — mongodump archive + restore-verify BEFORE the freeze:
   [`one-way-gate.md`](./one-way-gate.md) checklist + [`teardown-log.md`](./teardown-log.md) §5
   (explicitly operator-owned, NOT discharged by the local scrub).
4. **Prod ETL run** — freeze → `scripts/etl/export.ts` (mongoexport) → transform/import →
   outbox drain → reverse-ETL verify → flip:
   [`storefront-cutover-runbook.md`](./storefront-cutover-runbook.md) §3,
   [`scripts/etl/outbox/runbook.md`](../../scripts/etl/outbox/runbook.md),
   [`cms-cohort-cutover-runbook.md`](./cms-cohort-cutover-runbook.md).
5. **Prod soak** — post-flip verification windows + budgets:
   [`storefront-cutover-runbook.md`](./storefront-cutover-runbook.md) §6,
   [`cutover-budgets.md`](./cutover-budgets.md).
6. **MCP wiring** — keep `mongodb@claude-plugins-official` disabled in operator Claude/IDE
   settings (inventory trap #18; currently disabled, §2.1).

The surviving `scripts/etl/**` + `scripts/richtext-fidelity-check.ts` tooling exists solely for
items 3–5 and is deleted in a follow-up once the prod cutover soak completes.

## 7. Definition of Done — declared

**Zero Mongo. Zero Payload. Convex-only.** Both mongoose majors, both mongodb drivers, bson,
saslprep, mongodb-memory-server, and the entire `@payloadcms`/`payload` family are gone from
source, manifests, lockfile, dependency graph, compiled dist, env templates, machine env, CI
workflow + both shared composite actions, and running processes; `.mongo-dev/` and every MMS
binary cache are gone; the data layer, CMS, auth, e2e harness, and dev lifecycle run exclusively
on Convex. All program gates — G-SPIKE, G0, G1, G2, G3, G-RICH, G4, G5 — are green with the
artifacts pointed in §5. The only Mongo-token survivors are the §1 allowlist: the prod-cutover ETL
(file-based, by design), the gate tooling itself, frozen-seam/legacyId lineage documentation, and
append-only history. The remaining work is the §6 operator runbook, not the repository.
