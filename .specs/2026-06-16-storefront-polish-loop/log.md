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

### 8 — Breadcrumbs: fix per-crumb hrefs + nav landmark

- `hrefs = path.map((_) => …)` ignored the index, so **every breadcrumb (and JSON-LD item URL)
  pointed at the same URL**. Fixed to cumulative paths (`/a`, `/a/b`, …); Link re-adds the locale.
- A11y: rendered as a bare `<section>` — promoted to `<nav aria-label="Breadcrumb">` (landmark) and
  marked the current crumb `aria-current="page"`.
- Added tests: distinct cumulative hrefs (regression guard for the constant-URL bug), the nav
  landmark, and a single current marker.
- Verified: biome clean, typecheck clean, breadcrumbs 3/3.

### 9 — Input primitive: restore the keyboard focus indicator

- The shared `Input` / `MultilineInput` primitives did `focus:outline-none focus:ring-0` with **no
  replacement**, removing the keyboard focus indicator on every input that uses them (WCAG 2.4.7).
- Swapped both for the shared, tenant-themeable `focus-ring` utility (token `--focus-ring`, keyboard-
  only via `:focus-visible`). Removed the now-redundant focus suppression from the quantity-selector
  input so the indicator applies cleanly (the box keeps its `focus-within` border as a mouse affordance).
- Added input tests (focus-ring present, no `focus:outline-none`, className merge); quantity-selector
  suite still green.
- Verified: biome clean, typecheck clean, input + quantity 13/13.

### 10 — Themeable text color on the chrome surfaces

- Confirmed the `focus:outline-none` sweep is clean — every other case has a replacement
  focus-visible ring (the `contents` variant-image link delegates its ring to the child via
  `group-focus-visible`); no new WCAG focus gaps.
- Found three chrome surfaces hard-coding the **primary** text color to `text-black` on a themeable
  surface (`info-bar` on `--surface-1`, the header nav row on `--surface-0`, the geo-redirect banner
  on `--surface-1`) — a tenant theming those surfaces dark would get illegible black text.
  `text-black` isn't in the gate's banned set, so it slipped past.
- Switched all three to `text-(color:var(--text))` so the chrome tracks the tenant theme (and matches
  the #222 body ink the rest of the site uses; near-identical on the default theme).
- Verified: biome clean, typecheck clean, header/info-bar/geo-redirect 15/15.

### 11 — Themeable hover/focus accents (sweep the `*-black` states)

- Swept the five remaining un-themeable hover/focus `*-black` accents to tokens: the geo-redirect
  dropdown rows (`focus-within:/hover:text-black`), the modal / popover / picker-sheet close buttons
  (`hover:text-black`), and the filter-value chips (`hover:border-black hover:text-black`). All bases
  were `--text-muted`, so they now hover to `--text` (the primary ink) — correct on light and dark
  themes alike. Border accent → `hover:border-(--text)`.
- Left the `bg-black/NN` scrims (overlay backdrops) untouched — those are intentional translucent
  overlays, not theme ink.
- Re-sorted the touched class lists (biome `useSortedClasses`).
- Verified: biome clean (0 warnings), typecheck clean, filter-values + geo-redirect 17/17.

The storefront is now free of hard-coded `text-/border-black` ink on themeable surfaces (only
translucent `bg-black/NN` scrims remain, by design).

### 12 — Ratchet the gate against bare black ink

- Found one straggler the earlier sweeps missed — the empty-state cart button (`cart-button.tsx`)
  still used `text-black`; switched it to `text-(color:var(--text))`.
- Added `text-black` and `border-black` to the design-tokens gate's banned utilities, with a `(?!\/)`
  lookahead so the intentional translucent `bg-black/40` scrims and `border-black/[0.06]` hairlines
  stay exempt. The ratchet now prevents bare black ink on a themeable surface from creeping back.
- Verified: biome clean, typecheck clean, gate 22/22 (zero violations), cart-button 5/5.

### 13 — Cart note: give the textarea an accessible name

- The cart-note textarea had a `placeholder` but no accessible name — a placeholder disappears on
  input and isn't a reliable label (WCAG 3.3.2 / 4.1.2). Added `aria-label` reusing the existing
  `placeholder-cart-note` key (no new locale keys). This completes "every storefront text input has an
  accessible name" — search and quantity were already labeled; cart-note was the only gap among the
  Input/MultilineInput consumers.
- Added a test querying the field by accessible name.
- Verified: biome clean, typecheck clean, cart-note 5/5.

#### i18n note

The `t()` helper falls back to the raw key and `LocaleDictionaryKey` is type-derived from the
dictionaries, so any NEW user-facing string needs a key added to all six locale files
(en/de/es/fr/no/sv) — that's why `product-filters` ships literal sort/price labels and several generic
primitives carry literal `aria-label`s. A proper i18n pass is its own multi-file slice; logged below.

### 14 — Harden new-tab links in the shared Link primitive

- Confirmed the footer iOS safe-area gap is already fixed (folds `env(safe-area-inset-bottom)` into the
  footer box). But the storefront's `target="_blank"` links (footer social/section/legal + ~12 sites)
  carried no `rel` — reverse-tabnabbing exposure (the opened page can reach `window.opener`).
- Fixed once at the source: the shared `Link` now defaults `rel="noopener noreferrer"` when
  `target="_blank"` and no explicit `rel` is passed; callers needing a specific `rel` (rich-text
  renderer, `nofollow`) still win. One change hardens every external new-tab link.
- Added Link tests (new-tab default, explicit-rel preserved, same-tab unaffected).
- Verified: biome clean, typecheck clean, link 11/11, rich-text + footer 29/29.

### 15 — Localize cart-coupons (first i18n-pass slice)

- `cart-coupons` had no `i18n` prop and hard-coded English ("Active discounts", `Remove promo code
  "{code}"`) — wrong on every non-English store, and the remove button's only accessible name was that
  English title.
- Added two `cart` keys — `active-discounts` and `remove-discount` (with `{0}` code interpolation) —
  across all six locales (en/de/es/fr/no/sv) with real translations. Threaded `i18n` from
  `cart-summary` into `CartCoupons`; heading uses `t('active-discounts')`, the remove control uses
  `t('remove-discount', code)` for both `title` and `aria-label`.
- Updated the test to pass `i18n` and assert the interpolated localized accessible name.
- Verified: all six locale JSONs valid, biome clean, typecheck clean, cart-coupons + cart-summary 12/12.

### 16 — Localize product-filters (sort, facets, price, drawer)

- `product-filters` shipped ~12 literal English strings (the deliberate "pending localization keys"
  deferral): the four sort labels, the Sort aria-label, "Filters" (toolbar + drawer), "In stock"
  (chip + checkbox), "Clear all", Min/Max placeholders + Minimum/Maximum-price aria-labels, and the
  drawer "View ({n})" button.
- Added 14 `common` keys across all six locales with real translations; `SORT_OPTIONS` now carries a
  `labelKey` resolved via `t()` at render, and every literal is replaced with a `t()` call
  (`view-n` interpolates the count).
- Added a test (mocked navigation) asserting the sort control + its options + the Filters trigger
  render localized.
- Verified: all six locale JSONs valid, biome clean, typecheck clean (keys type-checked via
  `LocaleDictionaryKey`), product-filters 1/1.

### 17 — Localize the product-card variant pickers

- The float/inline/sheet pickers hard-coded "Add to bag" (×3), the inline fieldset `aria-label="Product
  options"`, and the sheet's `aria-label="Close"` + `Dialog.Description` "Choose product options".
  `ProductCardPickerProps` already carries `i18n`, so no threading was needed beyond the inner button.
- Unified "Add to bag" → the existing `common.add-to-cart` ("Add to Cart") so the CTA vocabulary is
  consistent with the rest of the flow; reused `common.close`; added `common.product-options` and
  `common.choose-product-options` across all six locales. `AddToBagButton` now takes a `label` prop
  (kept i18n-agnostic) and a stable `data-testid="picker-add-to-cart"`.
- Updated the float/inline tests to locate the CTA by testid (decoupled from copy) and to assert the
  localized fieldset label.
- Verified: six locale JSONs valid, biome clean, typecheck clean, picker 10/10.

### 18 — Localize the collection-rail arrows

- `collection-block-arrows` hard-coded `aria-label="Previous"/"Next"`. The client component has no
  i18n, and its server parent `collection-block` carries only `locale` (no dictionary).
- Added optional `previousLabel`/`nextLabel` props (English defaults preserved). `collection-block`
  now resolves the dictionary via `getDictionary({ shop, locale })` — only when arrows actually render
  (desktop carousel) — and passes capitalized `t('previous')`/`t('next')` (existing keys, no new ones).
  The dictionary import is bundler-cached, so multiple rails on a page stay cheap.
- Verified: biome clean, typecheck clean, arrows 2/2, CMS collection block 6/6.

### 19 — Product gallery: stable thumbnails with an active marker

- The PDP gallery filtered the active image out of the thumbnail strip, so selecting a thumbnail made
  it vanish, reflowed the strip, shifted the `view-image` numbering per selection, and left no active
  indicator. Standard gallery UX keeps all thumbnails and highlights the current one.
- Render every thumbnail; mark the active one with `aria-current="true"` + an accent border; number by
  stable array position; no-op the click on the already-active thumb (no needless fade replay).
- Updated the gallery test (promote via stable "View image 2", assert three stable thumbnails and the
  active marker).
- Verified: biome clean, typecheck clean, product-gallery 6/6.

### 20 — Quantity stepper: group the controls in a labeled fieldset

- Completes the iter-5 deferral. The stepper wrapper was a bare `<section>`; the decrease/input/increase
  controls weren't grouped, so assistive tech announced three loose controls. Converted to a
  `<fieldset aria-label={t('quantity')}>` (the element biome's `useSemanticElements` endorses for the
  group role) with an `m-0 min-w-0` reset so the UA fieldset margin / `min-inline-size: min-content`
  don't break the flex cart-line layout. Prop type switched to `HTMLProps<HTMLFieldSetElement>`.
- The group and the inner number input share the "quantity" name (group + spinbutton) — updated the
  one test that used an ambiguous `getByLabelText` to query the spinbutton by role; restored the group
  test.
- Verified: biome clean, typecheck clean, quantity-selector 10/10, cart-line 11/11, add-to-cart 6/6.

### 21 — Localize the add-to-cart "still loading" toast

- `add-to-cart.tsx` had a `// TODO: i18n` hard-coded English `toast.warning("The cart is still
  loading…")` shown when a shopper taps add before the cart hydrates. The component already has `tCart`.
- Added a `cart.still-loading` key across all six locales with interface-voice copy ("Your cart is
  still loading. Try again in a moment." — active, no over-apology, says what to do) and replaced the
  literal; added `tCart` to the callback deps.
- Verified: six locale JSONs valid, biome clean, typecheck clean, add-to-cart 6/6.

### 22 — Product vendor: never a dead end

- Closes overhaul spec #3. `ProductVendor` linked to the vendor's collection when one existed but
  rendered the vendor as **plain non-interactive text** otherwise (and `null` on any non-404 error) —
  a lost navigation path. The products listing already accepts a `vendor` search-param
  (`vendor:"<name>"`).
- Reworked: prefer `/collections/<handle>/`; on any lookup miss/failure fall back to
  `/products/?vendor=<encoded name>`, so the vendor is always a working link. Dropped the now-unused
  `NotFoundError` import and the plain-text branch.
- Added a test for the no-collection fallback link.
- Verified: biome clean, typecheck clean, product-vendor 4/4.

### 23 — Vendors rail: filtered-products links (no dead collection links)

- The CMS Vendors block (`blocks/vendors.tsx` → `informational/vendors.tsx`, production) linked every
  vendor chip to `/collections/<handle>/` with a TODO flagging the dead-link risk — those vendors are
  derived from products, so a matching collection isn't guaranteed.
- Pointed each chip at `/products/?vendor=<encoded title>` (always resolves; the listing compiles the
  raw vendor name into `vendor:"…"`), resolving the TODO and extending iter 22's no-dead-end rule to
  the bulk rail. A per-vendor collection-existence check was rejected — it's one API call per chip.
- Added the component's first test asserting filtered links and zero `/collections/` hrefs.
- Verified: biome clean, typecheck clean, vendors 1/1.

### 24 — Locale flags: full-name alt + no redundant announcement

- The flag images defaulted their alt/aria-label to the bare ISO code ("US"), and `LocaleFlag` with
  `withName` announced the country twice (flag alt + adjacent visible name).
- `LocaleFlag`: when the name is shown, render the flag decoratively (`alt=""`, `aria-hidden`);
  otherwise default the accessible name to the full country name via `countryLookup`. Applied the same
  full-name default to `CurrentLocaleFlag`.
- Test-infra: the global `vitest.setup.ts` mock of `@/utils/build-config` omitted
  `FLAG_IMAGES_BASE_URL`, so any flag-rendering test threw — added it, which unblocks flag tests
  generally. Added the components' first tests.
- Verified: biome clean, typecheck clean, locale-flag 3/3, flag consumers (geo-redirect/info-bar/footer) 16/16.

### 25 — Accepted payment methods: labeled, localized list

- The payment-brand icons rendered as a bare `<div>` of `<img>`s with no group name — assistive tech
  announced a run of brand images with no context.
- Reworked to a `<ul aria-label>` with one `<li>` per brand; added a localized
  `common.accepted-payment-methods` key across all six locales and a `label` prop (i18n-agnostic,
  defaulting to English). Threaded the label from both call sites — footer-content (`t`) and the cart
  page's cached `CartPaymentMethods` (via `getDictionary`).
- Test-infra: added the component's first test (mocking the icon lib) — empty → null, populated →
  labeled `<ul>` with the right `<li>` count.
- Verified: six locale JSONs valid, biome clean, typecheck clean, payment-methods 2/2, footer 3/3.

### 26 — Localize the collection "view all" tile

- `CollectionViewAllTile` hard-coded "View all of the products in {title}." — visible English copy on
  the tile that closes a collection rail/grid.
- Added a `common.view-all-in` key (`{0}` = the bold collection title) across all six locales and a
  `label?: ReactNode` prop (English fallback retained). `collection-block` builds the localized node
  with the ReactNode-literal `t()` form and reuses the same dictionary load it already does for the
  arrow labels (one `getDictionary` call covers both).
- Verified: six locale JSONs valid, biome clean, typecheck clean, CMS collection block 6/6.

### 27 — Extract the shared option-overflow button class

- The long `product-options-more …` button className was duplicated byte-for-byte across four call
  sites — `More` plus the `Overlay`'s SSR / desktop / mobile "show all" triggers — so the chassis
  could silently drift apart.
- Extracted it to a single exported `MORE_BUTTON_CLASS` in `more.tsx` (the control's canonical home)
  and consumed it from `overlay.tsx`'s three triggers. Byte-identical render; one source of truth.
- Verified: biome clean, typecheck clean, product-options + picker 109/109.

### 28 — Localize the cart secure-checkout reassurance

- The cart summary's trust blurb ("Safely complete your purchase through Nordcom AB's trusted
  partner's PCI DSS compliant checkout powered by Stripe and/or Shopify.") was hard-coded English with
  an inline link — untranslated on every non-English store. The dev-only discount fallback label was
  also a literal "discount".
- Added `cart.secure-checkout` across all six locales (the PCI-compliance link interpolated as `{0}`
  via the ReactNode-literal `t()` form; brand names kept in the copy) and replaced the literal;
  switched the dev label to `t('discount')` (existing key).
- Verified: six locale JSONs valid, biome clean, typecheck clean, cart-summary 7/7.

### 29 — Product category: never a dead end

- `ProductCategory` had the same dead-end pattern the vendor had before iter 22: collection-if-exists,
  else **plain non-interactive text**. The products listing accepts a `type` facet
  (`productType: searchParams.type` → `product_type:"…"`).
- Reworked to prefer `/collections/<handle>/` and fall back to `/products/?type=<encoded name>` on any
  lookup miss, so the category is always a working link. Added the no-collection fallback test.
- Verified: biome clean, typecheck clean, product-category 4/4.

### 30 — Search bar: localized placeholder + accessible name

- The search input hard-coded its English placeholder (TODO-flagged) and had **no accessible name**
  (placeholder-only — WCAG 3.3.2/4.1.2).
- Added `common.search-placeholder` across all six locales and an `aria-label={t('search')}` on the
  input (existing key). Dropped the TODO; used a typographic ellipsis.
- Verified: six locale JSONs valid, biome clean, typecheck clean, search 6/6.

### 31 — Mark the breadcrumbs skeleton decorative

- Audited search (landing/empty/count all built + localized after iter 30), product-description
  (delegates to sanitized ShopifyContent), gallery-share + login/export buttons (clean) — no gaps.
- One fix: the breadcrumbs loading placeholder was a bare `<section>` announced as an empty region
  while the real `nav[aria-label="Breadcrumb"]` streams in. Switched to `<div aria-hidden="true">`
  (decorative), removing the duplicate/empty landmark during load.
- Verified: biome clean, typecheck clean, breadcrumbs skeleton 1/1.

### 32 — Account link accessible name

- The header account link wrapped only an `<Avatar>` — whose `<img>` is `alt=""`/presentation when the
  user has a profile picture, leaving the link with no reliable accessible name (just a `title`); with
  initials it read as cryptic letters. WCAG 2.4.4 / 4.1.2.
- Added an explicit `aria-label={capitalize(t('account'))}` to the link so its purpose ("Account") is
  announced regardless of avatar state. Updated the Link test mock to forward arbitrary props and
  added an assertion.
- Verified: biome clean, typecheck clean, header-account-section 6/6.

### 33 — Tokenize the media-grid icon tiles (shrink the color gate)

- The CMS media-grid's icon tiles hard-coded `bg-gray-50` / `hover:bg-gray-100` (live + skeleton) — a
  deferred CMS-block color migration the design-tokens gate allowlisted. No tenant theme could recolor
  the tile surface.
- Migrated to `bg-(--surface-2)` / `hover:bg-(--surface-1)` (a subtle darken matching the original
  gray-50→gray-100) and removed `blocks/media-grid.tsx` from the gate allowlist — the ratchet shrinks,
  and the stale-entry test confirms the file is now clean.
- Verified: biome clean, typecheck clean, design-tokens gate 22/22.

#### Notes / deferred

- Confirmed `header-menu`'s mega-menu anchors to the trigger rect (overhaul spec #6 handled); it's a
  693-line stateful client component — decomposition is high-risk for a single loop pass.
- `FilterValues` BOOLEAN/PRICE_RANGE stubs are unused in production (the live filter is
  `ProductFilters`, which already has availability + price); not worth implementing.
- Product-options overlay/more aria-labels (`Close`, `Show all … options`) stay English: the
  product-options Root/context carry no i18n and it's SR-only text on an overflow control — touching
  the core context for every PDP/card isn't worth it. Logged, not done.
- `theme.ts` serializer only emits `--color-accent-*` `if (branding)`, and the `@theme inline`
  `--color-{primary,secondary}-*` mappings have no `var(…, fallback)` — a truly branding-less shop
  would have unresolved `bg-primary`/`bg-secondary-light`. Needs verifying whether `branding` is ever
  null in practice before changing a shared package. Low priority.
- Implement the BOOLEAN (in-stock) and PRICE_RANGE facets in `FilterValues` and wire the shared
  `ProductFilters` into /products, collections, and search (per the overhaul spec).
- Implement the BOOLEAN (in-stock) and PRICE_RANGE filter facets in `FilterValues` and wire the
  shared `Filters`/`ProductFilters` into /products, collections, and search (per the overhaul spec).
- Implement the BOOLEAN (in-stock) and PRICE_RANGE filter facets and wire `Filters` into
  /products, collections, and search as the shared faceted aside (per the overhaul spec).
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
