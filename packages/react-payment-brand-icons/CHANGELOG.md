# react-payment-brand-icons

## 0.2.1

### Patch Changes

- [#2028](https://github.com/filiphsps/commerce/pull/2028) [`d6b2cf0`](https://github.com/filiphsps/commerce/commit/d6b2cf07dfeb41344b70c44ce2bcefc000fcaa0f) Thanks [@filiphsps](https://github.com/filiphsps)! - Wipe the generated `icons/` output directory before re-emitting. A removed or renamed SVG — or a stale module from an earlier generator that emitted a different file extension — could otherwise linger and be picked up by the extensionless icon imports (vite resolves `.js` ahead of `.tsx`, so an orphan JSX-bearing `.js` broke the build locally).

## 0.2.0

### Minor Changes

- [`b4acd53`](https://github.com/filiphsps/commerce/commit/b4acd53a5e13692df8aa7defc5a3add82a142f38) Thanks [@filiphsps](https://github.com/filiphsps)! - Add a `dev` script that boots a tiny HTTP gallery (filter-as-you-type, dark
  theme, all 465 icons rendered from their source SVG) so contributors can
  browse the set without spinning up the storefront. The same `scripts/gallery.ts`
  also writes an MDX page for the docs app via `pnpm docs:gen`, keeping the
  public icon reference in sync with the package without a separate generator.

### Patch Changes

- [`272bbce`](https://github.com/filiphsps/commerce/commit/272bbce77ea333a94c2ba527b642ce92e961beaf) Thanks [@filiphsps](https://github.com/filiphsps)! - Remove `@svgr/plugin-svgo` from devDependencies. The codegen scripts call
  the bare `svgo` package directly and pass `svgo: false` to `@svgr/core`,
  so the SVGR-side plugin was never loaded.

- [`499a699`](https://github.com/filiphsps/commerce/commit/499a699696c7a0a9a8e25fab44bb5c05bafc3f1e) Thanks [@filiphsps](https://github.com/filiphsps)! - Inline each icon's SVG as a `data:` URI in the generated `docs/icons.mdx` so
  the page still resolves images after `apps/docs/scripts/mirror-workspace-docs.ts`
  mirrors it into `apps/docs/app/docs/(generated)/…`. The mirror only copies
  `.md(x)` files, so the previous `<img src="../svgs/<filename>">` 404'd at the
  mirrored URL. Keeping the markup as plain `<img>` also avoids MDX trying to
  parse SVG attributes like `xmlns:xlink` as JSX.

- [`09cf950`](https://github.com/filiphsps/commerce/commit/09cf9502933dd79c8eaff4601e1eb9d72425872c) Thanks [@filiphsps](https://github.com/filiphsps)! - <!-- cspell:ignore krungthaibank omise -->

  Replace `svgs/krungthaibank.svg`'s embedded raster PNG with a vector logo
  sourced from omise/banks-logo (MIT). The generated icon drops from ~515 KB
  to ~3 KB and no longer trips babel-generator's 500 KB pretty-print
  de-optimization at codegen time. Attribution lives in `NOTICE.md`.

- [`571d864`](https://github.com/filiphsps/commerce/commit/571d864ebde4102542390a7f636b53ae8b7509b5) Thanks [@filiphsps](https://github.com/filiphsps)! - Minify SVG markup at codegen time so each generated icon component ships
  the smallest possible inline JSX. Source `.svg` files in `svgs/` are
  untouched — the optimization runs only on the in-memory string handed to
  SVGR. Lets the build pipeline avoid babel-generator's pretty-print path
  for any icon whose inline content would otherwise tip past 500 KB.

- [`981a371`](https://github.com/filiphsps/commerce/commit/981a371dec6bd1e75c79e32fc2523038fa9ce2be) Thanks [@filiphsps](https://github.com/filiphsps)! - Re-serialize every source SVG in `svgs/` with two-space indentation so the
  checked-in files are human-readable. Pure formatting pass — `scripts/prettify-source-svgs.ts`
  runs SVGO with an empty plugin pipeline, so node structure, attribute values,
  and ids are preserved byte-for-byte aside from whitespace.

- [`d28e466`](https://github.com/filiphsps/commerce/commit/d28e466ef3d2548125e5b5e90cd04d35de458da5) Thanks [@filiphsps](https://github.com/filiphsps)! - Point each public package's `homepage` at its hosted docs page on the GH Pages
  docs site (`https://filiphsps.github.io/commerce/docs/...`) instead of the
  GitHub source tree, so npm and registry consumers land on rendered docs.

- [`7dff37c`](https://github.com/filiphsps/commerce/commit/7dff37c567191d1986ddfaef5966199d0da42653) Thanks [@filiphsps](https://github.com/filiphsps)! - Drop `scripts/` from coverage tracking. The directory holds codegen
  tooling, not shipped source, and counting it toward the package's
  coverage thresholds masks real gaps in `src/`.

## 0.1.0

### Minor Changes

- [#1908](https://github.com/filiphsps/commerce/pull/1908) [`62cdd53`](https://github.com/filiphsps/commerce/commit/62cdd53fafb2e0b916fa3f3239d398bf70a174f9) Thanks [@filiphsps](https://github.com/filiphsps)! - Initial release of `react-payment-brand-icons` — 465 payment-method brand icons as tree-shakeable React components plus a `<PaymentIcon>` dynamic-lookup wrapper.
