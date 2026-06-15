# Storefront Frontend Overhaul — Spec

> Status: **Design phase — iterating on mockups.** Implementation has not started.
> Visual reference: open [`design/index.html`](./design/index.html) in a browser. Every surface page links from there.

## Goal

Fix the storefront's broken/weak frontend surfaces, and consolidate duplicated UI into one shared, token-driven component layer (DRY). Each fix must be expressed as a **token** or a **layout change** so no tenant theme is invalidated.

## Locked decisions (from grilling)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Fidelity to current design | **Hybrid** — keep platform tokens, accent palette, Public Sans; reimagine layout only where broken/weak. |
| 2 | Unified filter facets | **Full faceted** — sort, price range, in-stock, vendor, product type, options (color swatches / size chips); mobile bottom-sheet. One component shared by `/products`, collections, search. |
| 3 | Product-card vendor link | **Collection-if-exists, else `/products?vendor=<handle>`** (no dead links on any tenant). |
| 4 | Cart-line customization | **Extend the theme-token system** (`--cart-line-*` on `ShopThemeTokens`); variants **reuse** the product-options swatch/chip primitives. |

## Mockups (iterate here first)

| Surface | File | Covers |
|---------|------|--------|
| Hub | `design/index.html` | Overview, design direction, token legend, DRY summary |
| Product page | `design/product-page.html` | Gallery, the always-visible lightbox bug, buy box |
| Carousel | `design/product-carousel.html` | Clipped edge shadow, forced last card, gutter rail |
| Product card | `design/product-card.html` | Anatomy/states, swatch/chip system, vendor link, dark-bg selected state |
| Collection | `design/collection.html` | Header with/without image, even grid fill, empty state |
| Collections index | `design/collections-index.html` | The missing `/collections` route |
| /products + filters | `design/products-index.html` | All-products page + shared faceted filter (DRY anchor) |
| Search | `design/search.html` | Crash fix, guarded states, shared filter |
| Cart | `design/cart.html` | Redesign, swatch-system line items, tenant cart-line tokens |
| Header | `design/header.html` | Mega-menu offset/alignment, 3 variants, per-shop config |
| Footer | `design/footer.html` | iOS safe-area white-gap fix |

Shared, re-skinnable layers the mockups (and the implementation) build on:
- `design/tokens.css` — faithful extract of platform-default theme tokens (+ new `--cart-line-*`, `.on-dark`, `--safe-bottom`).
- `design/ui.css` — the **one** component layer: product card, swatch/chip, button, filters, cart line, rail.
- `design/shell.css` — spec presentation chrome (not storefront UI).

## Root causes (verified in code)

1. **Lightbox always visible** — `product-gallery-lightbox.tsx`: the `<dialog>` className starts with `flex`, which overrides the UA `dialog:not([open]){display:none}`. It renders permanently and, never having entered the top layer until opened, stacks against page z-index. **Fix:** gate flex on `[open]` (`open:flex [&:not([open])]:hidden`) or render-on-open.
2. **Carousel edge shadow clipped + forced last card** — `globals.css` `rail-carousel` bleeds the scroll-shadow with `margin-block:-0.5rem`, arrows sit at `left/right:-8px`; an ancestor `overflow` clips both. `scroll-snap x mandatory` + `IntersectionObserver threshold:0.95` forces the last card flush. **Fix:** horizontal gutter padding + `margin-inline` (no negative block margins); fade masks on a non-clipping wrapper; arrows inside the wrap.
3. **Collection header weak/empty** — `collections/[handle]/page.tsx` renders a bare `<Heading>`; no image hero, no typographic treatment when image is absent. **Fix:** two header treatments (image hero / typographic).
4. **Cart-line variants bespoke** — `cart-line.tsx` renders `name·value` text pills, a separate styling. **Fix:** reuse `.opt-swatch`/`.opt-chip` read-only.
5. **Search crash** — `api/shopify/search.ts` (~L96) `unsafe_cast<Product>(item.node)` with a minimal fragment that can omit `variants`; the product card then derefs `variants.edges[0]` → `TypeError`. Also `search-content.tsx` only renders the empty state when `q` is non-empty, so no-query falls through to a collapsed `empty:hidden` section (blank page). Filters are a flat row, not the shared faceted aside. **Fix:** normalize/guard nodes (skip a card rather than throw), add a no-query landing state, reuse the shared filter.
6. **Header mega-menu offset** — `header-menu.tsx` portals the panel `position:fixed; left:0; right:0` (full viewport) while the inner card is `max-w-(--page-width)` centered, so it centers in the viewport rather than aligning to header content / the trigger. **Fix:** share the header's max-width container + padding; anchor compact/featured under the trigger (clamped); editorial spans content width.
7. **Footer iOS white gap** — footer background doesn't extend into `env(safe-area-inset-bottom)`; body bg shows through the home-indicator inset. **Fix:** `viewport-fit=cover` + `padding-bottom: env(safe-area-inset-bottom)` on the footer so its color fills the inset.
8. **Selected color on dark bg** — selected swatch ring is hard-coded `#14110b` and active chip is dark-on-white, invisible on dark surfaces (homepage banner, dark sections). **Fix:** components read tokens; an `.on-dark` context flips ink/border/ring/cta tokens once — fixes card, buy box, and cart together.
9. **`/collections` index missing** — only `/collections/[handle]` exists; the index 404s. **Fix:** new `/[domain]/[locale]/collections/page.tsx` listing route.

## DRY consolidation targets

- **One option system** (`product-options/primitives/*`) used by product card, buy box, and cart line.
- **One faceted filter** used by `/products`, collection pages, and search.
- **One rail/grid** component in two modes; gutter padding fixes the clipped edge for both.
- **Tokens not hard-codes**: cart-line look = `--cart-line-*` in `ShopThemeTokens` (admin theme editor renders the knobs for free); dark-surface = `.on-dark` token flip.

## Implementation plan (after design sign-off)

Sequenced so shared pieces land before consumers:
1. Tokens & primitives: add `--cart-line-*` + `.on-dark` token flip; ensure swatch/chip read tokens for ring/active. Changeset + `cms:gen` if descriptors change.
2. Shared faceted filter component + URL-param contract.
3. Shared rail/grid fix (gutter + fade + arrows).
4. Per-surface wiring: PDP lightbox, carousel, product card (vendor link + dark bg), collection header + grid, `/collections` index, `/products` filters, search (guard + filter), cart (swatch reuse + tokens), header alignment, footer safe-area.
5. Playwright e2e per the repo rule: a spec for each new/changed user-facing flow under `apps/storefront/e2e/`.

> Per `CLAUDE.md`: throw via `@nordcom/commerce-errors`, JSDoc every fn/component, `noUncheckedIndexedAccess`, trailing slashes, `isProduction()`/`isPreviewEnv()` for env gating, American English, changesets for non-ignored packages.
