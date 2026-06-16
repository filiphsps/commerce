# Affected-aware, cached CI & local testing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `test` cache per-package through turbo (so a PR re-runs only changed packages and replays the rest from cache) while preserving the exact storefront/admin coverage floors, add `--affected` to typecheck, and path-gate the e2e matrix.

**Architecture:** Each workspace package runs its own `vitest run --coverage` as a turbo `test` task (cacheable, outputs a coverage shard). `pnpm test` becomes `turbo run test` followed by a merge+gate step that combines all shards with `istanbul-lib-coverage` and enforces the global storefront/admin floors against the merged report. CI gains `--affected` on typecheck and a `dorny/paths-filter` gate on e2e.

**Tech Stack:** pnpm workspaces, Turborepo (local `.turbo` + remote cache via `TURBO_TOKEN`), Vitest 4.1.8 (`@vitest/coverage-v8`), `istanbul-lib-coverage`, GitHub Actions, `dorny/paths-filter`.

---

## File map

- Create `vitest.shared.ts` — single source for the coverage `exclude` list and the per-glob floors.
- Create `scripts/coverage-gate.ts` — merges per-package coverage shards, writes merged `coverage/coverage-final.json` + `coverage/coverage-summary.json`, enforces floors.
- Modify `vitest.config.ts` — import shared `exclude`, drop the inline `thresholds` (the gate owns them now).
- Modify `apps/storefront/vitest.config.ts`, `apps/admin/vitest.config.ts`, `apps/landing/vitest.config.ts` — `defineProject` → `defineConfig` with a coverage block.
- Modify the remaining 13 `package.json` `test` scripts to add `--coverage`; add a `test` script to the 8 packages that lack one; add CI junit reporters via the shared config.
- Modify root `package.json` — `test`, `test:coverage`, `test:all` scripts.
- Modify `turbo.json` — `test` task outputs.
- Modify `.github/workflows/ci.yml` — test job (gate), typecheck `--affected`, e2e path-filter.

Packages and their current state:

| Package | has `test` script | config style | coverage floor |
| --- | --- | --- | --- |
| apps/storefront | no | defineProject | **yes** |
| apps/admin | no | defineProject | **yes** |
| apps/landing | no | defineProject | no |
| apps/docs | yes (`vitest run`) | defineConfig | no |
| packages/cms | no | defineConfig | no |
| packages/convex | yes | defineConfig | no |
| packages/db | no | defineConfig | no |
| packages/errors | no | defineConfig | no |
| packages/marketing-common | no | defineConfig | no |
| packages/next-build-notifier | yes | defineConfig | no |
| packages/react-payment-brand-icons | yes | defineConfig | no |
| packages/shopify-graphql | yes | defineConfig | no |
| packages/shopify-html | yes | defineConfig | no |
| packages/test-convex | yes | defineConfig | no |
| packages/test-viewport | yes | defineConfig | no |
| packages/utils | no | defineConfig | no |

Only `apps/storefront/src/**` and `apps/admin/src/**` are floor-gated, so only those two must hit coverage parity with today's run. Every package still runs with `--coverage` so its shard contributes to the merged Codecov report, but drift in a non-floored package cannot fail the gate.

---

## Phase 0 — Capture the parity oracle

### Task 0: Record today's merged coverage numbers

**Files:** none (produces a throwaway artifact).

- [ ] **Step 1: Run the current full suite on a clean master**

Run: `git switch master && git pull --rebase && pnpm install --frozen-lockfile && pnpm run generate && pnpm run build:packages && pnpm test`
Expected: PASS, writes `coverage/coverage-summary.json`.

- [ ] **Step 2: Snapshot the storefront + admin totals**

Run:
```bash
node -e "const s=require('./coverage/coverage-summary.json');const pick=p=>Object.fromEntries(Object.entries(s).filter(([f])=>f.includes(p)));const sum=o=>{const t={lines:[0,0],branches:[0,0],functions:[0,0],statements:[0,0]};for(const v of Object.values(o))for(const k of Object.keys(t)){t[k][0]+=v[k].covered;t[k][1]+=v[k].total;}return Object.fromEntries(Object.entries(t).map(([k,[c,n]])=>[k,n?+(100*c/n).toFixed(2):100]));};console.log('storefront',sum(pick('/apps/storefront/src/')));console.log('admin',sum(pick('/apps/admin/src/')));" | tee /tmp/coverage-baseline.txt
```
Expected: two lines of `{lines, branches, functions, statements}` percentages. Keep `/tmp/coverage-baseline.txt` — Task 13 asserts the migrated run matches it.

- [ ] **Step 3: Do NOT commit anything**

This task only records numbers. Discard any coverage output: `git status` should be clean.

---

## Phase 1 — Shared config + gate script

### Task 1: Add the coverage-merge dependency

**Files:**
- Modify: `package.json` (root `devDependencies`)

- [ ] **Step 1: Add `istanbul-lib-coverage`**

Run: `pnpm add -Dw istanbul-lib-coverage`
Expected: adds `istanbul-lib-coverage` (and its types are bundled) to root `devDependencies`; `pnpm-lock.yaml` updates.

- [ ] **Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "build(ci): add istanbul-lib-coverage for shard merging."
```

### Task 2: Create the shared coverage module

**Files:**
- Create: `vitest.shared.ts`

- [ ] **Step 1: Write `vitest.shared.ts`**

The `coverageExclude` array is copied verbatim from the current `vitest.config.ts` (`exclude` plus the `scripts` entries) so per-package coverage denominators match today's root run. `COVERAGE_THRESHOLDS` is copied verbatim from the current root `coverage.thresholds`.

```ts
/**
 * Shared Vitest coverage configuration.
 *
 * Per-package `test` tasks each run standalone under turbo, so they cannot lean on the root
 * aggregation for coverage settings. This module is the single source for the exclude list
 * (keeping coverage denominators identical to the legacy single-process run) and the per-glob
 * floors, which are enforced against the MERGED report by `scripts/coverage-gate.ts`.
 */

/** Files excluded from coverage in every package. Mirrors the legacy root `coverageExclude`. */
export const coverageExclude = [
    '**/.next/**/*.*',
    '**/.turbo/**/*.*',
    '**/*.d.ts',
    '**/*.json',
    '**/*.scss',
    '**/coverage/**/*.*',
    '**/dist/**/*.*',
    '**/instrumentation.ts',
    '**/next.config.*',
    '**/node_modules/**/*.*',
    '**/src/generated/**/*.*',
    '**/tailwind.config.js',
    '**/vite.*.ts',
    '**/vitest.*.ts',
    '{apps,packages}/**/src/**/index.*',
    'next.config.js',
    'vite.config.ts',
    'vitest.config.ts',
    'vitest.workspace.ts',
    '**/scripts/**',
    'scripts/**',
];

/** Per-glob coverage floors enforced against the merged report. */
export const COVERAGE_THRESHOLDS: Record<
    string,
    { lines: number; branches: number; functions: number; statements: number }
> = {
    'apps/storefront/src/**': { lines: 65, branches: 50, functions: 75, statements: 60 },
    'apps/admin/src/**': { lines: 65, branches: 45, functions: 50, statements: 65 },
};
```

- [ ] **Step 2: Typecheck the new module**

Run: `pnpm exec tsc --noEmit vitest.shared.ts`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add vitest.shared.ts
git commit -m "test(ci): add shared coverage exclude list and floors."
```

### Task 3: Write the coverage merge + gate script

**Files:**
- Create: `scripts/coverage-gate.ts`

- [ ] **Step 1: Write `scripts/coverage-gate.ts`**

```ts
/**
 * Merge every package's coverage shard into one report and enforce the global floors.
 *
 * Each package's `test` task writes `<pkg>/coverage/coverage-final.json` (an istanbul-format
 * shard, cache-replayed by turbo for unchanged packages). This script merges them into a single
 * `coverage/coverage-final.json` + `coverage/coverage-summary.json` for the existing Codecov and
 * vitest-coverage-report CI steps, then asserts the per-glob floors from `vitest.shared.ts`
 * against the merged totals. Exits non-zero on any breach.
 *
 * @throws Never throws; reports failures by writing to stderr and setting a non-zero exit code.
 */
import { globSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { createCoverageMap, createCoverageSummary } from 'istanbul-lib-coverage';
import { COVERAGE_THRESHOLDS } from '../vitest.shared.ts';

const repoRoot = resolve(import.meta.dirname, '..');

/** Absolute coverage-shard paths, one per package that produced coverage. */
const shardPaths = globSync('{apps,packages}/*/coverage/coverage-final.json', { cwd: repoRoot }).map((p) =>
    resolve(repoRoot, p)
);

if (shardPaths.length === 0) {
    console.error('coverage-gate: no coverage shards found under {apps,packages}/*/coverage/.');
    process.exit(1);
}

const map = createCoverageMap({});
for (const shard of shardPaths) {
    map.merge(createCoverageMap(JSON.parse(readFileSync(shard, 'utf8'))));
}

mkdirSync(resolve(repoRoot, 'coverage'), { recursive: true });
writeFileSync(resolve(repoRoot, 'coverage/coverage-final.json'), JSON.stringify(map.toJSON()));

/** Build the json-summary the davelosert action consumes (`total` + per-file entries). */
const summaryJson: Record<string, unknown> = {};
const grandTotal = createCoverageSummary();
for (const file of map.files()) {
    const fileSummary = map.fileCoverageFor(file).toSummary();
    grandTotal.merge(fileSummary);
    summaryJson[file] = fileSummary.toJSON();
}
summaryJson.total = grandTotal.toJSON();
writeFileSync(resolve(repoRoot, 'coverage/coverage-summary.json'), JSON.stringify(summaryJson));

/** Normalize an absolute file path to a repo-relative POSIX path for glob-prefix matching. */
const toRel = (file: string): string => relative(repoRoot, file).split(sep).join('/');

let failed = false;
for (const [glob, floors] of Object.entries(COVERAGE_THRESHOLDS)) {
    const prefix = glob.replace(/\*\*$/, '');
    const scoped = createCoverageSummary();
    let matched = 0;
    for (const file of map.files()) {
        if (!toRel(file).startsWith(prefix)) continue;
        scoped.merge(map.fileCoverageFor(file).toSummary());
        matched += 1;
    }
    if (matched === 0) {
        console.error(`coverage-gate: floor "${glob}" matched no files in the merged report.`);
        failed = true;
        continue;
    }
    const totals = scoped.toJSON();
    for (const metric of ['lines', 'branches', 'functions', 'statements'] as const) {
        const pct = totals[metric].pct;
        const floor = floors[metric];
        const ok = pct >= floor;
        console.log(`${ok ? 'PASS' : 'FAIL'} ${glob} ${metric}: ${pct.toFixed(2)}% (floor ${floor}%)`);
        if (!ok) failed = true;
    }
}

if (failed) {
    console.error('coverage-gate: one or more coverage floors were not met.');
    process.exit(1);
}
console.log('coverage-gate: all floors met.');
```

- [ ] **Step 2: Commit**

```bash
git add scripts/coverage-gate.ts
git commit -m "test(ci): add coverage shard merge + floor gate."
```

---

## Phase 2 — Per-package wiring

### Task 4: Convert the storefront config to a coverage-capable standalone config

**Files:**
- Modify: `apps/storefront/vitest.config.ts`

- [ ] **Step 1: Switch the import and wrapper, add a coverage block**

Change the import line `import { configDefaults, defineProject } from 'vitest/config';` to:
```ts
import { configDefaults, defineConfig } from 'vitest/config';
import { coverageExclude } from '../../vitest.shared';
```
Change `export default defineProject({` to `export default defineConfig({`.
Inside the `test: { ... }` object, after the `exclude: [...]` entry, add:
```ts
        coverage: {
            provider: 'v8',
            include: ['apps/storefront/src/**'],
            exclude: coverageExclude,
            reporter: ['json', 'json-summary'],
        },
```

- [ ] **Step 2: Run storefront coverage standalone**

Run: `pnpm --filter @nordcom/commerce-storefront exec vitest run --coverage`
Expected: PASS; writes `apps/storefront/coverage/coverage-final.json` containing only `apps/storefront/src/**` files.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/vitest.config.ts
git commit -m "test(storefront): make the vitest config a coverage-capable standalone."
```

### Task 5: Convert the admin config

**Files:**
- Modify: `apps/admin/vitest.config.ts`

- [ ] **Step 1: Switch import/wrapper, add coverage block**

Change `import { dirname, resolve } from 'node:path';` block's vitest import `import { defineProject } from 'vitest/config';` to:
```ts
import { defineConfig } from 'vitest/config';
import { coverageExclude } from '../../vitest.shared';
```
Change `export default defineProject({` to `export default defineConfig({`.
Inside `test: { ... }`, after the `exclude: [...]` entry, add:
```ts
        coverage: {
            provider: 'v8',
            include: ['apps/admin/src/**'],
            exclude: coverageExclude,
            reporter: ['json', 'json-summary'],
        },
```

- [ ] **Step 2: Run admin coverage standalone**

Run: `pnpm --filter @nordcom/commerce-admin exec vitest run --coverage`
Expected: PASS; writes `apps/admin/coverage/coverage-final.json` with `apps/admin/src/**` files.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/vitest.config.ts
git commit -m "test(admin): make the vitest config a coverage-capable standalone."
```

### Task 6: Convert the landing config

**Files:**
- Modify: `apps/landing/vitest.config.ts`

- [ ] **Step 1: Switch import/wrapper, add coverage block**

Change its `import { defineProject } from 'vitest/config';` to:
```ts
import { defineConfig } from 'vitest/config';
import { coverageExclude } from '../../vitest.shared';
```
Change `export default defineProject({` to `export default defineConfig({`.
Inside `test: { ... }`, after its `exclude` entry (or, if it has none, as a new entry), add:
```ts
        coverage: {
            provider: 'v8',
            include: ['apps/landing/src/**'],
            exclude: coverageExclude,
            reporter: ['json', 'json-summary'],
        },
```

- [ ] **Step 2: Run landing coverage standalone**

Run: `pnpm --filter @nordcom/commerce-landing exec vitest run --coverage`
Expected: PASS; writes `apps/landing/coverage/coverage-final.json`.

- [ ] **Step 3: Commit**

```bash
git add apps/landing/vitest.config.ts
git commit -m "test(landing): make the vitest config a coverage-capable standalone."
```

### Task 7: Add coverage reporters to the 13 already-standalone package configs

**Files:**
- Modify each of: `apps/docs/vitest.config.ts`, `packages/cms/vitest.config.ts`, `packages/convex/vitest.config.ts`, `packages/db/vitest.config.ts`, `packages/errors/vitest.config.ts`, `packages/marketing-common/vitest.config.ts`, `packages/next-build-notifier/vitest.config.ts`, `packages/react-payment-brand-icons/vitest.config.ts`, `packages/shopify-graphql/vitest.config.ts`, `packages/shopify-html/vitest.config.ts`, `packages/test-convex/vitest.config.ts`, `packages/test-viewport/vitest.config.ts`, `packages/utils/vitest.config.ts`

These already use `defineConfig`. They only need a coverage `reporter` that writes the json shard. Apply this exact, identical edit to each file: ensure the `test.coverage` object exists and contains `reporter: ['json', 'json-summary']` and `provider: 'v8'`.

- [ ] **Step 1: For a config that already has a `coverage: { ... }` block (e.g. `packages/utils/vitest.config.ts`)**

Add `provider: 'v8',` and `reporter: ['json', 'json-summary'],` as the first two keys inside the existing `coverage: {` object. Example final shape for utils:
```ts
        coverage: {
            provider: 'v8',
            reporter: ['json', 'json-summary'],
            include: ['**/src/**/*.{ts,tsx}'],
            exclude: [
                '__tests__/*.*',
                '.vitest/*.*',
                '**/__snapshots__/**/*.*',
                '**/__tests__/**/*.*',
                '**/*.d.*',
                '**/*.test.*',
                '**/utils/test/**/*.*',
                'src/**/index.*',
                '**/src/**/config/*.*',
            ],
        },
```

- [ ] **Step 2: For a config with NO `coverage` block (most packages)**

Add this block inside `test: { ... }`:
```ts
        coverage: {
            provider: 'v8',
            reporter: ['json', 'json-summary'],
        },
```

- [ ] **Step 3: Verify each package emits a shard**

Run (loop over the 13):
```bash
for p in docs cms convex db errors marketing-common next-build-notifier react-payment-brand-icons shopify-graphql shopify-html test-convex test-viewport utils; do
  echo "== $p =="; pnpm --filter "*${p}" exec vitest run --coverage >/dev/null 2>&1 && echo ok || echo "FAIL $p";
done
ls {apps,packages}/*/coverage/coverage-final.json | wc -l
```
Expected: each prints `ok`; the final count is 16 (3 apps from Tasks 4-6 plus these 13).

- [ ] **Step 4: Commit**

```bash
git add apps/docs/vitest.config.ts packages/*/vitest.config.ts
git commit -m "test(packages): emit json coverage shards from every package."
```

### Task 8: Add/normalize the per-package `test` scripts

**Files:**
- Modify the `scripts.test` field of each `package.json`.

The 8 packages that lack a `test` script get one; the 8 that have `vitest run` get `--coverage`. Every package's `test` becomes exactly `vitest run --coverage`.

- [ ] **Step 1: Apply the script to all 16 packages**

Run:
```bash
node - <<'EOF'
const fs=require('fs');
const dirs=['apps/storefront','apps/admin','apps/landing','apps/docs','packages/cms','packages/convex','packages/db','packages/errors','packages/marketing-common','packages/next-build-notifier','packages/react-payment-brand-icons','packages/shopify-graphql','packages/shopify-html','packages/test-convex','packages/test-viewport','packages/utils'];
for(const d of dirs){const f=`${d}/package.json`;const p=JSON.parse(fs.readFileSync(f,'utf8'));p.scripts=p.scripts||{};p.scripts.test='vitest run --coverage';fs.writeFileSync(f,JSON.stringify(p,null,4)+'\n');console.log('set',d);}
EOF
```
Expected: prints `set <dir>` for all 16.

- [ ] **Step 2: Verify formatting matches the repo style**

Run: `pnpm biome format --write apps/*/package.json packages/*/package.json && git diff --stat`
Expected: only the `test` script lines (and possibly indentation normalization) changed.

- [ ] **Step 3: Commit**

```bash
git add apps/*/package.json packages/*/package.json
git commit -m "test(packages): run vitest with coverage from every package test script."
```

---

## Phase 3 — Root scripts, turbo task, and CI junit reporters

### Task 9: Route `pnpm test` through turbo + the gate

**Files:**
- Modify: `package.json` (root `scripts`)

- [ ] **Step 1: Rewrite the test scripts**

Replace the existing `"test"` and `"test:watch"` script lines with:
```json
        "test": "dotenv -c -- turbo run test --env-mode=loose && pnpm run test:coverage",
        "test:coverage": "tsx scripts/coverage-gate.ts",
        "test:all": "dotenv -c -- vitest run --coverage",
        "test:watch": "dotenv -c -- vitest watch",
```
`test:all` preserves the legacy single-process run as a fallback and parity oracle.

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "test(ci): run tests per-package through turbo, then merge + gate coverage."
```

### Task 10: Point the turbo `test` task outputs at the shard

**Files:**
- Modify: `turbo.json` (`tasks.test`)

- [ ] **Step 1: Narrow the `test` task outputs**

In `turbo.json`, the `test` task's `outputs` is currently `["coverage/**"]`. Leave `outputs` as `["coverage/**"]` (it already captures the per-package shard) but confirm the task keeps `"dependsOn": ["^build:packages"]`. No structural change is required; verify the task block reads:
```json
        "test": {
            "dependsOn": ["^build:packages"],
            "inputs": [
                "$TURBO_DEFAULT$",
                "!**/*.md",
                "!**/e2e/**",
                "!**/public/**",
                "!**/playwright.config.*",
                "!**/playwright-report/**",
                "!**/test-results/**"
            ],
            "outputs": ["coverage/**"],
            "outputLogs": "new-only"
        },
```
If it already matches, make no edit and skip the commit.

- [ ] **Step 2: Dry-run turbo to confirm the task is discovered for every package**

Run: `pnpm exec turbo run test --dry-run=json | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).tasks.map(t=>t.package).sort()))"`
Expected: an array listing all 16 package names.

- [ ] **Step 3: Commit (only if `turbo.json` changed)**

```bash
git add turbo.json
git commit -m "build(ci): confirm the turbo test task captures per-package coverage."
```

### Task 11: Emit per-package junit for Codecov test-results

**Files:**
- Modify each of the 16 `vitest.config.ts` files (add a CI-only junit reporter).

- [ ] **Step 1: Add a junit reporter gated on `CI`**

In each package's `vitest.config.ts`, inside `test: { ... }`, add:
```ts
        reporters: process.env.CI === 'true' ? ['default', ['junit', { outputFile: './junit.xml' }]] : ['default'],
```
If a config already declares `reporters`, replace that line with the one above. Each package runs in its own directory under turbo, so `./junit.xml` is unique per package.

- [ ] **Step 2: Verify junit is written in CI mode**

Run: `CI=true pnpm --filter @nordcom/commerce-utils exec vitest run --coverage && ls packages/utils/junit.xml`
Expected: PASS and the file exists.

- [ ] **Step 3: Commit**

```bash
git add apps/*/vitest.config.ts packages/*/vitest.config.ts
git commit -m "test(packages): emit per-package junit in CI for Codecov test results."
```

### Task 12: Drop the inline thresholds from the root config

**Files:**
- Modify: `vitest.config.ts`

The gate now owns the floors; the root config keeps coverage reporting for `test:all` only and must not double-gate.

- [ ] **Step 1: Import the shared exclude and remove `thresholds`**

At the top of `vitest.config.ts`, add `import { coverageExclude } from './vitest.shared';`. Replace the local `coverageExclude` derivation with the import (delete the `const exclude = [...]`-derived `coverageExclude` only — keep `exclude` for `test.exclude`). In `coverage: { ... }`, set `exclude: coverageExclude` and DELETE the entire `thresholds: { ... }` object.

- [ ] **Step 2: Confirm the legacy run still passes without gating**

Run: `pnpm run test:all`
Expected: PASS; no threshold errors (gating now lives in `test:coverage`).

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts vitest.shared.ts
git commit -m "test(ci): move coverage floors out of the root config into the gate."
```

---

## Phase 4 — Validation

### Task 13: Coverage parity check

**Files:** none.

- [ ] **Step 1: Run the new pipeline end to end**

Run: `pnpm run build:packages && pnpm test`
Expected: PASS; the gate prints `PASS apps/storefront/src/** ...` and `PASS apps/admin/src/** ...` lines and `coverage-gate: all floors met.`

- [ ] **Step 2: Compare merged totals to the Task 0 oracle**

Run:
```bash
node -e "const s=require('./coverage/coverage-summary.json');const pick=p=>Object.fromEntries(Object.entries(s).filter(([f])=>f.includes(p)));const sum=o=>{const t={lines:[0,0],branches:[0,0],functions:[0,0],statements:[0,0]};for(const v of Object.values(o))for(const k of Object.keys(t)){t[k][0]+=v[k].covered;t[k][1]+=v[k].total;}return Object.fromEntries(Object.entries(t).map(([k,[c,n]])=>[k,n?+(100*c/n).toFixed(2):100]));};console.log('storefront',sum(pick('/apps/storefront/src/')));console.log('admin',sum(pick('/apps/admin/src/')));"
cat /tmp/coverage-baseline.txt
```
Expected: storefront and admin percentages match `/tmp/coverage-baseline.txt` within ±0.5pt. If they drift more, reconcile the per-app `coverage.include`/`exclude` (Tasks 4-5) against `vitest.shared.ts` until they match, then re-run.

- [ ] **Step 3: Cache correctness — touch one package, confirm the rest replay**

Run:
```bash
pnpm test >/dev/null 2>&1   # warm the cache
touch packages/utils/src/index.ts
pnpm exec turbo run test --filter='[HEAD]' --dry-run=json | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const t=JSON.parse(d).tasks;console.log('cached:',t.filter(x=>x.cache.status==='HIT').length,'/ total:',t.length)})"
```
Expected: only the changed package(s) miss; the rest report `HIT`. Then `pnpm test` still produces a complete 16-package merged report (all shards present from cache).
Cleanup: `git checkout packages/utils/src/index.ts`.

- [ ] **Step 4: Gate fires on a breach**

Prove the gate fails on an unmet floor: edit `vitest.shared.ts` to set the `apps/storefront/src/**` `lines` floor to `100`, then run the gate against the already-written shards:
```bash
pnpm run test:coverage; echo "exit=$?"
```
Expected: a `FAIL apps/storefront/src/** lines: <pct>% (floor 100%)` line and `exit=1`.

- [ ] **Step 5: Revert the artificial floor**

Run: `git checkout vitest.shared.ts && pnpm run test:coverage`
Expected: `coverage-gate: all floors met.` and `exit=0`.

---

## Phase 5 — CI workflow

### Task 14: Switch the CI test job to the gate and keep Codecov wiring

**Files:**
- Modify: `.github/workflows/ci.yml` (the `test` job)

- [ ] **Step 1: No change to the run line**

The `test` job already runs `pnpm run test` (line ~119), which now does `turbo run test` + the gate. Leave it. The gate writes `coverage/coverage-final.json` and `coverage/coverage-summary.json`, which the existing `davelosert/vitest-coverage-report-action` and `codecov/codecov-action` (coverage) steps already read — no change.

- [ ] **Step 2: Point the Codecov test-results step at per-package junit**

In the `🦺 Codecov Test Results` step, change the condition and `files`:
- Condition: `if: ${{ !cancelled() && hashFiles('apps/*/junit.xml', 'packages/*/junit.xml') != '' }}`
- `files: ./apps/*/junit.xml,./packages/*/junit.xml`

- [ ] **Step 3: Save the turbo cache from the test job**

In the `test` job's `💾 Save bootstrap caches` step, add `save-turbo: 'true'` so test shards persist locally between runs (remote cache via `TURBO_TOKEN` already persists them, but this speeds same-runner reuse).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: gate merged coverage and upload per-package junit from the test job."
```

### Task 15: Add `--affected` to the typecheck job

**Files:**
- Modify: `.github/workflows/ci.yml` (the `typecheck` job)

- [ ] **Step 1: Give turbo the git history it needs**

In the `typecheck` job's `🕶️ Checkout repository` step, add:
```yaml
              with:
                  fetch-depth: 0
```

- [ ] **Step 2: Run affected typecheck on PRs, full on push**

Change the `✅ Typecheck` step to:
```yaml
            - name: ✅ Typecheck
              env:
                  TURBO_SCM_BASE: ${{ github.event_name == 'pull_request' && github.event.pull_request.base.sha || '' }}
                  TURBO_SCM_HEAD: ${{ github.event_name == 'pull_request' && github.sha || '' }}
              run: |
                  if [ "${{ github.event_name }}" = "pull_request" ]; then
                      pnpm run typecheck -- --affected
                  else
                      pnpm run typecheck
                  fi
```
This skips packages neither changed nor downstream of a change on PRs; master/staging/dev pushes run the full set to seed the cache.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: typecheck only affected packages on pull requests."
```

### Task 16: Path-gate the e2e matrix

**Files:**
- Modify: `.github/workflows/ci.yml` (add a `changes` job, gate the `e2e` matrix, fix `dispatch`/`cleanup` needs)

- [ ] **Step 1: Add a `changes` job that emits the apps-to-test array**

Add this job (place it before `e2e`):
```yaml
    changes:
        name: 🔎 Detect app changes
        timeout-minutes: 5
        runs-on: ubuntu-latest
        outputs:
            apps: ${{ steps.apps.outputs.apps }}
        steps:
            - name: 🕶️ Checkout repository
              uses: actions/checkout@v6

            - name: 🔎 Filter
              id: filter
              uses: dorny/paths-filter@v3
              with:
                  filters: |
                      storefront:
                          - 'apps/storefront/**'
                          - 'packages/**'
                          - 'pnpm-lock.yaml'
                      admin:
                          - 'apps/admin/**'
                          - 'packages/**'
                          - 'pnpm-lock.yaml'

            - name: 🧮 Build app matrix
              id: apps
              run: |
                  if [ "${{ github.event_name }}" != "pull_request" ]; then
                      echo 'apps=["storefront","admin"]' >> "$GITHUB_OUTPUT"
                      exit 0
                  fi
                  apps=()
                  [ "${{ steps.filter.outputs.storefront }}" = "true" ] && apps+=('"storefront"')
                  [ "${{ steps.filter.outputs.admin }}" = "true" ] && apps+=('"admin"')
                  joined=$(IFS=,; echo "${apps[*]}")
                  echo "apps=[${joined}]" >> "$GITHUB_OUTPUT"
```
Non-PR events (master/staging/dev pushes) always run both apps.

- [ ] **Step 2: Gate the e2e job on the matrix**

Change the `e2e` job header to depend on both `build` and `changes`, run only when the matrix is non-empty, and source the matrix from `changes`:
```yaml
    e2e:
        name: 🎭 E2E
        needs: [build, changes]
        if: ${{ needs.changes.outputs.apps != '[]' }}
        timeout-minutes: 60
        runs-on: ubuntu-latest
        strategy:
            fail-fast: false
            matrix:
                app: ${{ fromJSON(needs.changes.outputs.apps) }}
```
Leave the rest of the `e2e` job body unchanged.

- [ ] **Step 3: Keep `cleanup-artifacts` and `dispatch` correct when e2e is skipped**

The `cleanup-artifacts` job already guards with `if: always() && needs.e2e.result != 'skipped'` — no change. In the `dispatch` job's `needs`, e2e may be skipped on a docs-only PR; since `dispatch` only runs on master push (where both apps run), no change is required. Verify `dispatch.needs` still lists `e2e` and its `if` remains `github.event_name == 'push' && github.ref == 'refs/heads/master'`.

- [ ] **Step 4: Validate the workflow parses**

Run: `pnpm dlx @action-validator/cli .github/workflows/ci.yml || npx --yes action-validator .github/workflows/ci.yml`
Expected: no schema errors. (If the validator is unavailable, run `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml'))"` to confirm valid YAML.)

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run e2e only for apps whose code or shared packages changed."
```

---

## Phase 6 — Final verification

### Task 17: Full local gate + changeset

**Files:**
- Create: a changeset (no package versions change behavior, but `package.json` scripts and configs in published packages changed — pick `patch`).

- [ ] **Step 1: Run the complete local pipeline**

Run: `pnpm run build:packages && pnpm lint && pnpm run typecheck && pnpm test`
Expected: all PASS; gate prints `coverage-gate: all floors met.`

- [ ] **Step 2: Add a changeset**

Run: `pnpm changeset`
Pick `patch` for every touched non-ignored package. Summary (WHY-only):
```
Run unit tests per-package through turbo so unchanged packages restore from cache; coverage is merged and floor-gated across packages.
```

- [ ] **Step 3: Commit**

```bash
git add .changeset
git commit -m "chore: changeset for per-package cached test pipeline."
```

- [ ] **Step 4: Push and open CI**

Run: `git push origin master`
Expected: CI runs; the `test` job restores turbo cache, the gate passes, typecheck runs full (push to master), e2e runs both apps (push event). Confirm green before considering the work done.

---

## Self-review notes

- **Spec coverage:** §1 cache-not-affected → Tasks 8-10; §2 config migration → Tasks 4-8; §3 merge+gate → Tasks 2-3, 12; §4 CI → Tasks 14-16; §5 validation → Tasks 0, 13, 17. All spec sections map to tasks.
- **Parity oracle** is captured before any change (Task 0) and asserted after (Task 13), addressing the spec's primary risk.
- **Only storefront/admin** need exact parity (only they are floor-gated); other packages contribute shards without gating, limiting blast radius.
- **CI edge cases** covered: empty e2e matrix (skips cleanly), push-event full runs (seed cache + full e2e), turbo `--affected` git-history requirement (`fetch-depth: 0` + `TURBO_SCM_BASE/HEAD`).
