---
'react-payment-brand-icons': patch
'@tagtree/next': patch
'@tagtree/core': patch
'@tagtree/shopify': patch
'@tagtree/payload': patch
---

Point each public package's `homepage` at its hosted docs page on the GH Pages
docs site (`https://filiphsps.github.io/commerce/docs/...`) instead of the
GitHub source tree, so npm and registry consumers land on rendered docs.
