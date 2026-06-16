---
"next-build-notifier": patch
"react-payment-brand-icons": patch
"@nordcom/cart-core": patch
"@nordcom/cart-next": patch
"@nordcom/cart-react": patch
"@nordcom/cart-shopify": patch
"@tagtree/core": patch
"@tagtree/next": patch
"@tagtree/shopify": patch
"lspmesh": patch
---

Run unit tests per-package through turbo so an unchanged package restores its result from the build cache instead of re-running; coverage is merged across packages and floor-gated as before. Tooling-only — no change to published output.
