# @nordcom/cart-core

## 0.2.2

### Patch Changes

- [`67e3ee6`](https://github.com/filiphsps/commerce/commit/67e3ee60dd18f26aae86341286b902e0cfc6e18c) Thanks [@filiphsps](https://github.com/filiphsps)! - Run unit tests per-package through turbo so an unchanged package restores its result from the build cache instead of re-running; coverage is merged across packages and floor-gated as before. Tooling-only — no change to published output.

## 0.2.1

### Patch Changes

- [`29f8582`](https://github.com/filiphsps/commerce/commit/29f85824396ac30bea101697a4ee2b4ac1581b13) Thanks [@filiphsps](https://github.com/filiphsps)! - Add npm version and downloads badges to the package READMEs, and point each `homepage` at its live docs page under `https://filiphsps.github.io/commerce/packages/…`.

## 0.2.0

### Minor Changes

- [#2018](https://github.com/filiphsps/commerce/pull/2018) [`f4500a5`](https://github.com/filiphsps/commerce/commit/f4500a52fffdd4f48e8a2f1434b1c4d9edd22067) Thanks [@filiphsps](https://github.com/filiphsps)! - Add a `clear` cart mutation and `clear()` action so emptying the cart issues one bulk line removal instead of one `removeLine` per line.

- [#1945](https://github.com/filiphsps/commerce/pull/1945) [`d5133c3`](https://github.com/filiphsps/commerce/commit/d5133c3f3e8c874e3e56647f5cf8dcfbb1cfb41b) Thanks [@filiphsps](https://github.com/filiphsps)! - Initial publish: framework-agnostic cart kernel, types, capabilities, adapter contract, middleware (logger, tracing, idempotency, retry, analytics), event bus, money helpers, contract tests, and mock adapter.

### Patch Changes

- [`f78ea78`](https://github.com/filiphsps/commerce/commit/f78ea78176aa84bf0be95c87d19c2f36c91ed15c) Thanks [@filiphsps](https://github.com/filiphsps)! - Refresh the shared dev/build toolchain (vite, vitest, concurrently) and the React/Next dev pins to their latest releases as part of a monorepo-wide dependency upgrade. Internal-only — published runtime dependencies and peer ranges are unchanged.

- [#1960](https://github.com/filiphsps/commerce/pull/1960) [`72bdabe`](https://github.com/filiphsps/commerce/commit/72bdabeed3b03d1f0a35a63257550dc97dd9ce0f) Thanks [@filiphsps](https://github.com/filiphsps)! - Backfill JSDoc on public/internal symbols.
