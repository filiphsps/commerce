# Affected-aware, cached CI & local testing

## Problem

Unit tests are the largest avoidable cost in CI and locally. `pnpm test` runs a single
root `vitest run --coverage` over all 16 vitest projects on every PR, regardless of what
changed — it bypasses turbo entirely, so there is no caching and no affected detection.
`typecheck` and `build` already route through turbo with local + remote cache, but they
still run every package (no `--affected`). The e2e matrix runs both `storefront` and
`admin` on every PR even when the diff touches neither. Only the `convex` job is
affected-aware today (via `dorny/paths-filter`).

Goal: a PR that touches only one package runs that package's checks and restores everything
else from cache, instead of re-running the whole monorepo — without weakening the existing
coverage gate.

## Decisions (locked)

- **Coverage strategy: cache + merge shards.** Per-package `test` tasks each emit their own
  coverage shard. Turbo caches each task; unchanged packages replay their shard from cache.
  A final step merges all shards into one report and enforces the existing
  `apps/storefront/src/**` and `apps/admin/src/**` global floors against the merged report.
  No Codecov behavior change.
- **Cache, not `--affected`, for `test`.** `--affected` would skip unchanged packages
  entirely, so their coverage would never regenerate and the global floor would break. Cache
  replay restores each package's `coverage/` output, keeping the merged report complete while
  unchanged packages cost ~0.
- **Lint stays as root biome.** `biome lint .` covers the whole repo in ~144 ms. Per-package
  turbo + cache overhead would exceed that. No change.
- **E2E: path-filter per app.** Reuse the `dorny/paths-filter` pattern already in the
  `convex` job.

## Architecture

### Test task (turbo, per-package, cached)

- Add a `test` script to the 8 packages that lack one: `admin`, `landing`, `storefront`,
  `cms`, `db`, `errors`, `marketing-common`, `utils`. Each runs `vitest run --coverage`
  against its own config, in its own directory. (The other 8 — `docs`, `convex`,
  `next-build-notifier`, `react-payment-brand-icons`, `shopify-graphql`, `shopify-html`,
  `test-convex`, `test-viewport` — already have a `test` script.)
- Migrate every config currently authored as `defineProject` (storefront, admin, and any
  other) to a self-sufficient `defineConfig` with coverage enabled. Under the root
  `projects` aggregation these leaned on the root config for coverage provider/excludes;
  running standalone under turbo, each must carry its own coverage configuration and any
  excludes it relied on (`**/src/**/index.*`, `**/src/generated/**`, generated dirs, etc.).
- `pnpm test` becomes `turbo run test` (was the root `vitest run --coverage`). The `test`
  task already exists in `turbo.json` (`dependsOn: ["^build:packages"]`, `outputs:
  ["coverage/**"]`); narrow its `outputs` to the per-package coverage shard path
  (e.g. `coverage/coverage-final.json`).
- Preserve a `pnpm test:all` that runs the single-process root vitest (current behavior) for
  the rare "run everything in one process" need and as a coverage-parity oracle.

### Coverage merge + gate (`pnpm test:coverage`)

- Each package emits an istanbul/v8 JSON shard (`coverage-final.json`) as a turbo output, so
  it is cache-replayed for unchanged packages.
- A new non-cached root step merges all shards via `istanbul-lib-coverage`, enforces the
  existing per-glob floors against the **merged** report, and emits one merged
  `coverage-final.json` plus `junit.xml` for the existing Codecov / vitest-coverage-report
  steps.
- The per-glob thresholds move OUT of per-package configs into this gate — they are
  cross-package floors (`apps/storefront/src/**`, `apps/admin/src/**`) and only mean
  anything against the merged report.

Current floors to preserve exactly:

| Glob | lines | branches | functions | statements |
| --- | --- | --- | --- | --- |
| `apps/storefront/src/**` | 65 | 50 | 75 | 60 |
| `apps/admin/src/**` | 65 | 45 | 50 | 65 |

### CI (`ci.yml`)

- **test job**: `turbo run test` (cache restores unchanged shards) → `pnpm test:coverage`
  (merge + gate) → existing Codecov / coverage-report steps unchanged. The turbo-cache
  save/restore already wired into the bootstrap composite covers the new shards.
- **typecheck job**: add `--affected` on PRs (already turbo + cached; this skips unaffected
  packages entirely). Full run on master push to seed the cache and the baseline.
- **e2e**: add a `dorny/paths-filter` step. Run storefront e2e only when `apps/storefront/**`
  or a shared package changes; admin e2e only when `apps/admin/**` or a shared package
  changes. A shared-package change runs both. Mirror the `convex` job's filter shape.
- **lint job**: unchanged.
- **Base ref**: PRs diff the merge base automatically (paths-filter and turbo both resolve it
  from the PR event); master push runs the full set.

## Validation

1. **Coverage parity.** `pnpm test` (new, turbo + merge) produces the same merged coverage
   numbers as today's root single-process run (`pnpm test:all`). Diff per-file coverage
   before/after; adjust per-package excludes until merged == baseline. This is the gate on
   the whole change.
2. **Cache correctness.** Touch one package, confirm turbo cache-hits the other 15 and the
   merged coverage report is still complete (all packages present).
3. **E2E gating.** A docs-only diff skips both e2e apps; a storefront-only diff runs
   storefront e2e and skips admin; a shared-package diff runs both.
4. **Threshold gate fires.** Artificially drop a covered storefront file below its floor and
   confirm `pnpm test:coverage` fails with the same message shape as today.

## Risks

- **Coverage drift** between the old single-process run and per-package + merge, from
  different module-resolution boundaries. Mitigated by the §1 parity check.
- **Lost root excludes.** Per-package configs that relied on root-level excludes must carry
  them locally or coverage denominators shift. Caught by the parity check.
- **Shared-package e2e blind spot.** A change in a shared package that breaks an app's e2e
  must still trigger that app — hence "shared package change runs both" in the filter.

## Out of scope

- Turbo-izing lint.
- `--affected` for the `test` task (deliberately rejected above).
- Reworking the Convex / integration / limit-boundary jobs (already affected-aware).
- E2E sharding or parallelization beyond the per-app path gate.
