# @nordcom/cart-shopify

## 0.2.3

### Patch Changes

- [`95249fe`](https://github.com/filiphsps/commerce/commit/95249febac61d518d31e5ad7036488825300b88b) Thanks [@filiphsps](https://github.com/filiphsps)! - Update domain to <nordcom.store> 🎉

- Updated dependencies [[`95249fe`](https://github.com/filiphsps/commerce/commit/95249febac61d518d31e5ad7036488825300b88b)]:
  - @nordcom/cart-core@0.2.3

## 0.2.2

### Patch Changes

- [`67e3ee6`](https://github.com/filiphsps/commerce/commit/67e3ee60dd18f26aae86341286b902e0cfc6e18c) Thanks [@filiphsps](https://github.com/filiphsps)! - Run unit tests per-package through turbo so an unchanged package restores its result from the build cache instead of re-running; coverage is merged across packages and floor-gated as before. Tooling-only — no change to published output.

- Updated dependencies [[`67e3ee6`](https://github.com/filiphsps/commerce/commit/67e3ee60dd18f26aae86341286b902e0cfc6e18c)]:
  - @nordcom/cart-core@0.2.2

## 0.2.1

### Patch Changes

- [`29f8582`](https://github.com/filiphsps/commerce/commit/29f85824396ac30bea101697a4ee2b4ac1581b13) Thanks [@filiphsps](https://github.com/filiphsps)! - Add npm version and downloads badges to the package READMEs, and point each `homepage` at its live docs page under `https://nordcom.store/docs/packages/…`.

- Updated dependencies [[`29f8582`](https://github.com/filiphsps/commerce/commit/29f85824396ac30bea101697a4ee2b4ac1581b13)]:
  - @nordcom/cart-core@0.2.1

## 0.2.0

### Minor Changes

- [#1945](https://github.com/filiphsps/commerce/pull/1945) [`d5133c3`](https://github.com/filiphsps/commerce/commit/d5133c3f3e8c874e3e56647f5cf8dcfbb1cfb41b) Thanks [@filiphsps](https://github.com/filiphsps)! - Initial publish: Shopify cart adapter using an injected `ShopifyTransport`, gql.tada mutations + normalizer, all-capabilities-on by default, `updateBuyerCountry` custom mutation, and `mockShopifyTransport` testing utility.

### Patch Changes

- [`f78ea78`](https://github.com/filiphsps/commerce/commit/f78ea78176aa84bf0be95c87d19c2f36c91ed15c) Thanks [@filiphsps](https://github.com/filiphsps)! - Refresh the shared dev/build toolchain (vite, vitest, concurrently) and the React/Next dev pins to their latest releases as part of a monorepo-wide dependency upgrade. Internal-only — published runtime dependencies and peer ranges are unchanged.

- [#1970](https://github.com/filiphsps/commerce/pull/1970) [`16d77ff`](https://github.com/filiphsps/commerce/commit/16d77ff17570fa8ba5b2de5d619879f23568d840) Thanks [@filiphsps](https://github.com/filiphsps)! - Add missing @example to mockShopifyTransport per Tier-1 spec.

- [#1965](https://github.com/filiphsps/commerce/pull/1965) [`3a5af48`](https://github.com/filiphsps/commerce/commit/3a5af48c73e3887bfcbc65d0143acae333c1ab85) Thanks [@filiphsps](https://github.com/filiphsps)! - Backfill JSDoc on public/internal symbols.

- Updated dependencies [[`f78ea78`](https://github.com/filiphsps/commerce/commit/f78ea78176aa84bf0be95c87d19c2f36c91ed15c), [`f4500a5`](https://github.com/filiphsps/commerce/commit/f4500a52fffdd4f48e8a2f1434b1c4d9edd22067), [`d5133c3`](https://github.com/filiphsps/commerce/commit/d5133c3f3e8c874e3e56647f5cf8dcfbb1cfb41b), [`72bdabe`](https://github.com/filiphsps/commerce/commit/72bdabeed3b03d1f0a35a63257550dc97dd9ce0f)]:
  - @nordcom/cart-core@0.2.0
