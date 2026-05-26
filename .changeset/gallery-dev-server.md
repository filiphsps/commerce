---
'react-payment-brand-icons': minor
---

Add a `dev` script that boots a tiny HTTP gallery (filter-as-you-type, dark
theme, all 465 icons rendered from their source SVG) so contributors can
browse the set without spinning up the storefront. The same `scripts/gallery.ts`
also writes an MDX page for the docs app via `pnpm docs:gen`, keeping the
public icon reference in sync with the package without a separate generator.
