# Build / Test / Lint / Typecheck Ground Truth — 2026-05-28

Baseline captured on `master` @ `2cccd3f9a`, macOS (darwin 25.6.0), 8 CPUs, vitest 4.1.7, turbo 2.9.15, biome.

## TL;DR

| Command | Result | Counts |
|---|---|---|
| `pnpm build:packages` | PASS (exit 0) | 19/19 tasks, FULL TURBO cache hit |
| `pnpm typecheck` | PASS (exit 0) | 25/25 tasks |
| `pnpm lint` (Biome) | PASS (exit 0) | 0 errors, 37 warnings + 3 infos |
| `pnpm test --project @nordcom/commerce-storefront` | PASS tests, FLAKY run | 841 passed / 2 skipped / 0 failed (170 files) |
| `pnpm test` cart (4 sub-projects) | PASS (exit 0) | 111 passed / 0 failed / 0 skipped (26 files) |

The codebase is GREEN on all four gates. The one wrinkle: the storefront `pnpm test` run intermittently exits 1 due to a **flaky vitest V8 coverage-provider race**, NOT a test failure (details below).

---

## 1. `pnpm build:packages` — PASS

```
Tasks:    19 successful, 19 total
Cached:    19 cached, 19 total
Time:    128ms >>> FULL TURBO
```

All workspace packages build from cache. Apps consume these via `dist/`.

## 2. `pnpm typecheck` — PASS

```
Tasks:    25 successful, 25 total
Time:    24.9s
```

No type errors anywhere (all apps + packages, `tsc -noEmit`). Includes `next typegen` for admin/landing/docs/storefront.

## 3. `pnpm lint` (Biome) — PASS (exit 0, warnings only)

```
Checked 1422 files. Found 37 warnings. Found 3 infos.  (exit 0)
```

Biome treats these as non-blocking warnings. Rule tally:

| Count | Rule |
|---|---|
| 27 | `lint/nursery/useSortedClasses` (Tailwind class order — mostly `apps/docs`) |
| 3 | `lint/suspicious/noExplicitAny` |
| 3 | `lint/suspicious/noArrayIndexKey` |
| 3 | `lint/style/useTemplate` |
| 3 | `lint/correctness/useExhaustiveDependencies` |
| 2 | `lint/style/noDescendingSpecificity` |
| 1 | `lint/complexity/noImportantStyles` |

`useExhaustiveDependencies` (3) is the only category worth a look on the storefront effect surfaces touched by the recent iOS fixes; the rest are cosmetic / docs-app.

## 4. Storefront tests — PASS (841/843) but run is FLAKY under coverage

Canonical command (`pnpm test --project @nordcom/commerce-storefront --coverage.enabled=false`, exit 0):

```
Test Files  169 passed | 1 skipped (170)
     Tests  841 passed | 2 skipped (843)
  Duration  17.60s
```

Coverage summary (from a clean coverage run): **Statements 80.13% (3308/4128), Branches 63.42%, Functions 83.92%, Lines 80.67%** — above the regression floors in `vitest.config.ts` (lines 65 / branches 50 / functions 75 / statements 60).

**2 intentionally skipped tests:**
- `src/api/_loaders.cache.test.ts > cacheTag end-to-end (skipped — environment limitation)`
- `src/app/[domain]/[locale]/products/[handle]/page-dedup.test.ts > PDP fetch dedup > layout + slots together call ProductApi once for the same handle`

### FLAKE: V8 coverage-provider unhandled rejection (run exits 1 intermittently)

Running the DEFAULT `pnpm test --project @nordcom/commerce-storefront` (which forces `--coverage`) twice gave different exit codes:
- Run #1: completed, printed full coverage summary, `posttest` ran → exit 0.
- Run #2: **exit 1** with an unhandled rejection *after* all tests passed:

```
⎯⎯⎯⎯ Unhandled Rejection ⎯⎯⎯⎯⎯
Error: Something removed the coverage directory "/Users/filiphsandstrom/commerce/coverage/.tmp" Vitest created earlier.
Make sure you are not running multiple Vitests with the same "coverage.reportsDirectory" at the same time.
 ❯ V8CoverageProvider.normalizeCoverageFileError .../vitest/dist/chunks/coverage.DM_a_rWm.js:729:128
Caused by: Error: ENOENT: no such file or directory, open '/Users/filiphsandstrom/commerce/coverage/.tmp/coverage-138.json'
```

No stray vitest processes were running; this is a race inside vitest 4.1.7's V8 coverage provider (its `.tmp` cleanup deletes a worker's coverage shard before it is read). All 841 tests passed in both runs — the failure is purely in coverage-report generation. **Risk: CI `pnpm test` can flap red on a fully-green suite.** Mitigations to evaluate: pin/upgrade vitest, set a per-run unique `coverage.reportsDirectory`, or disable cross-project coverage parallelism.

### IMPORTANT: do NOT run the storefront suite via bare `vitest run`

Running `pnpm --filter @nordcom/commerce-storefront exec vitest run` (bypassing the harness) produced **18 failed + 2 broken suites** — all artifacts, not real failures:
- `src/api/_loaders.test.ts` (18 tests) and `src/api/shopify/search.test.ts` throw `MissingEnvironmentVariableError: Required environment variable "MONGODB_URI" is missing` — bypassing `pretest` (in-process mongo bootstrap) + `dotenv -c` leaves `MONGODB_URI` unset and `@nordcom/commerce-db` explodes at module load (`packages/db/src/db.ts:59`).
- `src/api/shopify/search.regression.test.ts` does `readFileSync(join(process.cwd(), 'apps/storefront/src/api/shopify/search.ts'))`; under `--filter exec` cwd is the app dir → doubled path `apps/storefront/apps/storefront/...` → ENOENT. This test has a **latent cwd assumption** (only works when cwd == repo root).

Always use `pnpm test …` so `pretest`/`dotenv` run.

## 5. Cart tests — PASS

`pnpm test --project @nordcom/cart-core --project @nordcom/cart-react --project @nordcom/cart-next --project @nordcom/cart-shopify` (exit 0):

```
Test Files  26 passed (26)
     Tests  111 passed (111)
  Duration  3.42s
```

Per project: cart-core 44 tests, cart-react 26, cart-next 23, cart-shopify 22. Coverage **69.29% stmts / 56.32% branch / 68.84% funcs / 70.87% lines**.

---

## Test-coverage gaps in the requested surfaces

### Cart
- **`add-to-cart.tsx` (storefront)** — has test (5 cases) but only **78.84% stmt / 63.51% branch / 71.42% func** (uncovered ~L56,160,175,206). Weak branch coverage on the add-to-cart error/disabled/variant paths.
- **`cart-line.tsx` (storefront)** — has test (4 cases); other cart components (`cart-lines`, `cart-summary`, `cart-note`, `cart-coupons`, header `cart-button`) all have tests.
- **Cart package line mutation logic is thin:** `packages/cart/next/src/form-actions.ts` (addLineAction/updateLineAction) only **47.56% stmt / 52.54% branch**; `packages/cart/react/src/hooks.ts` **15.55% stmt / 4.54% branch**; `react/src/use-events.ts` **31.57%**; `react/src/provider.tsx` **62.83%**; `shopify/src/adapter.ts` **51.21%**; `core/src/kernel.ts` **65.3% / 42.22% branch**. The line *predictor* (`react/src/predictors/line.ts`) is well covered (92.85%).

### Pickers
- `product-card/picker/{float,inline,sheet,registry}` ALL have dedicated tests (float 100%, inline 100%, sheet 85.71%, registry 81.25%).
- **GAP: `product-card/primitives/product-card-picker.tsx`** has a test file but only **35.29% stmt / 9.09% branch / 25% func** — the primitive that actually drives picker selection is largely untested.

### Product-options selector
- `product-options-selector.tsx` — **100% stmt / 93.75% branch** (good, has test).
- Renderers `size-chip-renderer.tsx` + `text-chip-renderer.tsx` both have tests. **`renderers/chip-class.ts` has NO dedicated test.**
- `product-options/product-options.tsx` 93.02% stmt / 72.72% branch; `resolver.ts` 98% (has test).
- **GAP: `product-options/context.ts`** (ProductOptionsContext — the sync-effect-deps file stabilized in commit `8333bc6c9`) has **NO dedicated test**, only indirect coverage **85.71% stmt / 50% branch**.
- `product-options/primitives/overlay.tsx` has a test but **70.83%** (L28-29, 93-150 uncovered); `primitives/more.tsx` has **NO dedicated test** (91.66% indirect).

### useVariantUrlSync
- `hooks/useVariantUrlSync.ts` — **HAS test (6 cases), 100% stmt / 83.33% branch / 100% func / 100% lines** (one branch at L54 uncovered). Well covered; commit `e51851e4e` documents the double-replace guard.

### iOS-fix surfaces (recent commits)
- **`product-options/use-is-desktop.ts`** (commit `fb03e72aa`, the `useIsDesktop` matchMedia hook) — **NO dedicated test**; only **92.85% stmt / 75% func** indirectly. The SSR-null default, matchMedia `addEventListener('change')` subscribe, and cleanup paths are not directly asserted.
- **`product-options/context.ts`** (commit `8333bc6c9`) — see above, no dedicated test, 50% branch.
- **option-chip `touch-action: manipulation`** (commit `2cccd3f9a`) — applied in `product-card/cta/inline-button.tsx` + `float-pill.tsx`; CSS property, not unit-asserted (float-pill 84.61%).
- **iOS Safari CSS/layout** (commit `5d2afc19f`) — SCSS, not unit-testable.

## Flaky tests
- Only one flake observed: the **V8 coverage-provider `coverage/.tmp` removal** unhandled rejection on the storefront `pnpm test` run (see §4). It is non-deterministic and exit-code-affecting; the underlying tests are stable.
- The 18+2 "failures" seen via bare `vitest run` are deterministic harness-bypass artifacts (missing `MONGODB_URI` + cwd assumption), NOT flakes.
