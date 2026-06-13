# @nordcom/cart-react

## 0.2.0

### Minor Changes

- [#2018](https://github.com/filiphsps/commerce/pull/2018) [`f4500a5`](https://github.com/filiphsps/commerce/commit/f4500a52fffdd4f48e8a2f1434b1c4d9edd22067) Thanks [@filiphsps](https://github.com/filiphsps)! - Add a `clear` cart mutation and `clear()` action so emptying the cart issues one bulk line removal instead of one `removeLine` per line.

- [#1945](https://github.com/filiphsps/commerce/pull/1945) [`d5133c3`](https://github.com/filiphsps/commerce/commit/d5133c3f3e8c874e3e56647f5cf8dcfbb1cfb41b) Thanks [@filiphsps](https://github.com/filiphsps)! - Initial publish: React 19 provider with slice contexts, predictive mutation queue with cascade-cancel and cross-tab sync, capability-typed actions, line + cart predictors, `<CartForm>` zero-JS primitive, and `./devtools` panel.

### Patch Changes

- [`f690eb9`](https://github.com/filiphsps/commerce/commit/f690eb92f6363364e000ab8a90810d4d1780fd71) Thanks [@filiphsps](https://github.com/filiphsps)! - Fix `cartReady` permanently stuck at `false`. `seededRef` was read inside a `useMemo` factory but not included in the dependency array — after `setInitial` dispatch `state.pending` stayed the same array reference, so the memo never recomputed and `cartReady` never became `true`. Replaced the ref with `useState` so React tracks the transition and recomputes the status slice correctly on mount.

- [#1969](https://github.com/filiphsps/commerce/pull/1969) [`47ae0b0`](https://github.com/filiphsps/commerce/commit/47ae0b06b60ac3367de967f9da2aef2bf11ef74b) Thanks [@filiphsps](https://github.com/filiphsps)! - Address jsdoc review followups: missing @example on Props types, capability-mixin example typings, American English.

- [#1967](https://github.com/filiphsps/commerce/pull/1967) [`f0047c2`](https://github.com/filiphsps/commerce/commit/f0047c2f9c1937bb83fe54ab5ac9eb9dc6357a84) Thanks [@filiphsps](https://github.com/filiphsps)! - Backfill JSDoc on public/internal symbols.

- Updated dependencies [[`f4500a5`](https://github.com/filiphsps/commerce/commit/f4500a52fffdd4f48e8a2f1434b1c4d9edd22067), [`d5133c3`](https://github.com/filiphsps/commerce/commit/d5133c3f3e8c874e3e56647f5cf8dcfbb1cfb41b), [`72bdabe`](https://github.com/filiphsps/commerce/commit/72bdabeed3b03d1f0a35a63257550dc97dd9ce0f)]:
  - @nordcom/cart-core@0.2.0
