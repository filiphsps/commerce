# Storefront Polish Loop — running log

Branch `dev/storefront-polish-loop`. Each Ralph iteration takes one focused slice of the
storefront (UX/UI polish, DRY extraction, token-driven configurability, cross-engine/responsive
validation), commits logically, and pushes before the next iteration.

Guiding principles (from the task + repo design system):

- Every visual resolves from P3 semantic tokens (`--surface-*`, `--text*`, `--state-*`, …) so a
  theme-less shop renders sensibly and a tenant theme recolors the set. No hard-coded Tailwind colors.
- Pin new text-on-surface token pairs to WCAG AA in `design-tokens.gate.test.ts`.
- Break large components into reusable primitives; extract similar-intent components into generics.
- Keep JSDoc on every function/component; canonical Tailwind; American English.

## Iterations

### 1 — Alert: token-driven surfaces, legible foregrounds, a11y role

- `components/informational/alert.tsx` was the design system's outlier: hard-coded `bg-yellow-200`
  (no tenant could recolor it), and the `error` severity set a saturated `--state-danger` background
  with **no foreground**, leaving illegible dark `--text` on red. No ARIA role on urgent alerts.
- Promoted warning to themeable sources `--color-warning-light` / `--color-warning-dark` and a
  `--surface-warning` / `--text-warning-strong` token pair (mirrors the success pair) in `globals.css`.
- Reworked Alert to map each severity to a surface + explicit on-surface ink (`error` → white on
  danger, the gate-certified pairing; `warning` → warm-brown on amber; `success` → strong green ink),
  and derive an ARIA role (`alert` for warning/error, `status` otherwise), caller-overridable.
- Extended `design-tokens.gate.test.ts`: pinned the new token literals to their sources and asserted
  `--text-warning-strong` on `--surface-warning` clears WCAG AA normal.
- Verified: biome clean, storefront typecheck clean, gate (19) + blocks (18) tests pass.

### 2 — Variant badges: tokenize the last hard-coded badge fills

- Swept all components for hard-coded colors outside the gate's banned subset. Only outliers:
  `product-display/primitives/variant-badges.tsx` hard-coded `bg-purple-600` (gift card) and
  `bg-blue-600` (subscription), while vegan/sale/free-shipping already read tokens.
- Promoted both to themeable `--badge-gift-card-bg` / `--badge-subscription-bg` tokens (defaults keep
  the exact prior purple/blue), so a tenant can recolor every overlay badge. Collapsed `h-3 w-3` →
  canonical `size-3`.
- Gate: pinned both token literals and asserted white-on-badge clears WCAG AA normal (both ~5.2:1).
- Verified: biome clean, typecheck clean, gate 21/21.

### 3 — Product-card wrappers: extract a generic, close the recommendation gap

- `collection`/`recommendation`/`search` product-card wrappers were near-identical thin delegations,
  but `recommendation` rendered the raw `SURFACE_PRESETS.recommendation` instead of the shop cascade —
  so tenants could theme collection/search cards but **not** recommendation cards (configurability gap).
- Extracted `components/products/surface-product-card.tsx`: one generic that resolves any `surface`
  through the full cascade (instance → per-surface selection → store base → preset → built-in) and
  renders `ProductCard`. All three wrappers now delegate, pinning only their `surface` + display name.
- Recommendation cards are now tenant-customizable like the rest; no-extensions shops stay byte-identical.
- Added an extensions test locking that the recommendation surface honors store base + per-surface
  selection over the preset.
- Verified: biome clean, typecheck clean, extensions 3/3 + presets pass.

### 4 — Alert info severity gets its own surface

- The `info` severity rendered on neutral `--surface-1`, visually indistinguishable from a plain card.
- Added a light-info surface (`--color-info-light` → `--surface-info`) paired with the existing
  dark-blue info ink (`--text-info-strong` ← `--color-block-info-dark`), so info now reads as
  informational. Severity color system is complete: success/warning/error/info/callout each distinct.
- Gate: pinned both tokens and asserted AA (~6.1:1).
- Verified: biome clean, typecheck clean, gate 22/22.

### 5 — QuantitySelector: disable increase at the max-quantity bound

- The decrease button disabled at the lower bound, but the increase button never disabled at the
  shop's `maxQuantity` — clicking it at the ceiling silently no-opped (the clamp swallowed it) with no
  visual or assistive-tech signal. Asymmetric, confusing UX.
- Added `increaseDisabled = disabled || quantity >= maxQuantity`, wired to the button's `disabled` /
  `aria-disabled` and its interaction styles, mirroring the decrease-at-min behavior.
- Added a unit test (increase disabled at value === maxQuantity, decrease still enabled).
- Note: also tried `role="group"`/`aria-label` on the stepper wrapper, but biome's `useSemanticElements`
  requires `<fieldset>` for that role, which conflicts with the div-typed prop spread + flex layout —
  deferred; the per-button `aria-label`s already name each control.
- Verified: biome clean, typecheck clean, quantity-selector 9/9.

### 6 — Pagination: fix the page-param parse bug + a11y current marker

- `currentPage` guarded with `Number.isSafeInteger(page)` where `page` is a **string** — always false,
  so a malformed `?page=abc` parsed to `NaN`, propagating into the prev/next hrefs (`?page=NaN`) and
  killing the active-page highlight (`i === NaN` never matches).
- Extracted a pure `resolveCurrentPage(raw, first, last)` helper: parse → finite-fallback to first →
  clamp to `[first, last]`. Unit-tested directly (valid / null / empty / `abc` / overflow / negative).
- A11y: marked the active page `aria-current="page"` (screen readers now announce the current page);
  marked the decorative ellipsis `aria-hidden`.
- Verified: biome clean, typecheck clean, pagination 5/5.

### 7 — Filter values: deselectable LIST facets + a11y selected state

- The `FilterValues` LIST branch always linked a value to *setting* itself, so a selected facet could
  never be toggled off, and it mutated the shared `searchParams` object inside the render map. No
  selected-state was exposed to assistive tech.
- Rewrote LIST: each value builds its href from a fresh params copy — active values link to clearing
  themselves (deselect), inactive values swap the selection. Marked the active value `aria-current` /
  `data-active`, and collapsed the swatch `h-3 w-3` → `size-3`.
- Added tests for the set / toggle-off / swap href paths. (BOOLEAN/PRICE_RANGE remain stubs — those
  facets are unimplemented and not yet wired into any page; full faceting is a separate slice.)
- Verified: biome clean, typecheck clean, filter-values 9/9.

#### Candidate slices for future iterations (audit backlog)

- Implement the BOOLEAN (in-stock) and PRICE_RANGE filter facets and wire `Filters` into
  /products, collections, and search as the shared faceted aside (per the overhaul spec).
- Hard-coded-color sweep is now clean for named Tailwind utilities + raw hex in components/blocks.
- Stepper grouping: revisit as a properly-styled `<fieldset>` (reset margin/min-width, div→fieldset
  prop type) so the three controls share one accessible group name.
- Pagination disabled prev/next are non-interactive `<div>`s — consider `aria-disabled` semantics or
  hiding them; also evaluate truncated ranges (no leading ellipsis / first-page jump).
- Cross-engine/responsive validation (Safari + Chromium) of header mega-menu, gallery lightbox,
  rail carousel per the overhaul spec root-causes — needs a running storefront + browser.
- Verify responsive + Safari/Chromium behavior of interactive components (header mega-menu, product
  gallery lightbox, rail carousel) per the overhaul spec root-causes.
- Extract repeated card wrappers (collection/recommendation/search product cards) — confirm they are
  already thin wrappers over the product-card primitives or DRY them further.
