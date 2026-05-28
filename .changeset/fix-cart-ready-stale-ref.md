---
'@nordcom/cart-react': patch
---

Fix `cartReady` permanently stuck at `false`. `seededRef` was read inside a `useMemo` factory but not included in the dependency array — after `setInitial` dispatch `state.pending` stayed the same array reference, so the memo never recomputed and `cartReady` never became `true`. Replaced the ref with `useState` so React tracks the transition and recomputes the status slice correctly on mount.
