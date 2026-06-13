# @nordcom/cart-core

## 0.2.0

### Minor Changes

- [#2018](https://github.com/filiphsps/commerce/pull/2018) [`f4500a5`](https://github.com/filiphsps/commerce/commit/f4500a52fffdd4f48e8a2f1434b1c4d9edd22067) Thanks [@filiphsps](https://github.com/filiphsps)! - Add a `clear` cart mutation and `clear()` action so emptying the cart issues one bulk line removal instead of one `removeLine` per line.

- [#1945](https://github.com/filiphsps/commerce/pull/1945) [`d5133c3`](https://github.com/filiphsps/commerce/commit/d5133c3f3e8c874e3e56647f5cf8dcfbb1cfb41b) Thanks [@filiphsps](https://github.com/filiphsps)! - Initial publish: framework-agnostic cart kernel, types, capabilities, adapter contract, middleware (logger, tracing, idempotency, retry, analytics), event bus, money helpers, contract tests, and mock adapter.

### Patch Changes

- [#1960](https://github.com/filiphsps/commerce/pull/1960) [`72bdabe`](https://github.com/filiphsps/commerce/commit/72bdabeed3b03d1f0a35a63257550dc97dd9ce0f) Thanks [@filiphsps](https://github.com/filiphsps)! - Backfill JSDoc on public/internal symbols.
