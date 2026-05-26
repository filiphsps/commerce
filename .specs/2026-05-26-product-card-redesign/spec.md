# Product card redesign

**Date:** 2026-05-26
**Status:** Drafted
**Scope:** `apps/storefront` · product-card primitives + per-surface wrappers + CollectionBlock rail enhancement + search bug fix + CSS-modules → Tailwind migration in three files

---

## Summary

Replace the current product-card system with a token-driven, registry-extensible chassis. Move every visual decision behind CSS custom properties so the future tenant customization system can override them per-shop. Drop the broken patterns that produced visible defects in production (size pills with text strikethrough, `+0` overflow chips, search rendering zero cards, recommendations carousel overflowing the viewport). Keep the existing `product-options/` primitive package — compose, don't rebuild. Maximize server rendering; keep client islands at the interactive leaves.

## Problem

Symptoms confirmed in production (`https://beta.pouched.de`) and root-caused in the codebase:

1. **Search renders 0 product cards despite "3 PRODUCTS" label.** `apps/storefront/src/api/shopify/search.ts:15-77` defines a `searchProducts` query that omits the `variants` field. `apps/storefront/src/components/products/search-product-card.tsx:26-28` short-circuits to `null` when `data.variants.edges[0]?.node` is missing. Every search result returns null. The `unsafe_cast<Product>(item.node)` at `search.ts:118` masks the missing field at type level.
2. **`+N` overflow chip data-source mismatch.** `apps/storefront/src/components/product-options/primitives/more.tsx:15` computes overflow as `Math.max(0, group.values.length - 4)`. `apps/storefront/src/components/product-options/primitives/group.tsx:18-34` separately runs a `useEffect` that reads `--inline-limit` from `getComputedStyle`, recomputes overflow, and **directly mutates** the More element's `textContent` via `rowEl.parentElement?.querySelector('[data-option-more]')`. When size row and color row are siblings, both Group `useEffect`s mutate the same first-matched More element. Last-writer-wins. The displayed `+N` no longer reflects either group's data.
3. **Size pills with text strikethrough on the base card.** `collection-product-card.tsx:51` mounts `ProductCardOptions` at the base-card level, surfacing the full size option set. `apps/storefront/src/components/product-options-selector/renderers/size-chip-renderer.tsx` (CSS-module styled) renders unavailable sizes with text-decoration strike, which reads as a broken textbox, not a state.
4. **Recommendations rail overflows the viewport.** `apps/storefront/src/components/products/collection-block.tsx:99-114` lays out horizontal-rail children with `grid-flow-col`, `auto-cols`, `snap-x`, and `overflow-x-shadow` — but has no arrow affordance, no IntersectionObserver-driven hint, no edge-fade. On PDPs the last card is visibly clipped with no way to scroll.
5. **Image banding.** `aspect-ratio: 4/5` container + `object-fit: contain` + non-4:5 source images shows the wrapper tile bg as a stripe above the product. Reads as a render bug.
6. **Mini-PDP overload on base card.** The card today exposes size pills + color swatches + add-to-cart inline. This forces variable card heights (option counts differ per product), makes horizontal layouts impossible to fit, and gives the product image the least visual real estate. Hierarchy inverted.

## Goals

- **Information architecture**: base card shows product (image, vendor, title, price, color swatches as hint, urgency). All variant selection happens in a picker.
- **Hybrid interaction model**: browse-first card with a `+` affordance that opens a picker (or fast-path adds when single buyable variant).
- **Surface-routed picker presentation**: vertical card on grid → float; horizontal/mobile → sheet; inline-button CTA → in-place. Override via token.
- **Token-driven defaults**, registry-extensible placement & picker shapes. No enforced aesthetic. Tenant theming applies under `[data-shop="…"]` when the customization system lands.
- **Search-rendering bug fixed in Phase 1**, before the redesign rewrites the components.
- **CSS-modules eliminated** from three files: `product-card.module.css`, `product-options-selector.module.css`, `renderers/chip.module.css`. Migration is 1:1 port to Tailwind; no `product-options-selector` visual redesign.
- **`+N` chip rendering and `RecommendationsRail` (via enhanced `CollectionBlock`) deliver the missing UX affordances.**
- **Maximize server rendering**, isolate client interactivity to leaf primitives.

## Non-goals

- **No `product-options/` primitive visual redesign.** That ships in a future spec using the frontend-design skill. This spec composes the existing primitives as-is, except for the `+N` chip race-condition fix in `Group.tsx`.
- **No tenant customization system implementation.** Tokens are wired so the system CAN exist; building it is out of scope.
- **No PDP variant selector redesign** beyond the CSS-module migration. The selector retains its current shape; CSS modules port to Tailwind, no visual change.
- **No visual regression / screenshot testing.** Deferred. Adds flakiness cost without a corresponding maintenance budget in this spec.
- **No cart-line / `CartLine` changes.** That's a separate component owned by the cart feature.
- **No `CartDrawerProductCard`.** It has zero consumers; it gets deleted.

## Interaction model

### Base card

The card is a browse tile, not a buy form. Components on the base card:

- Image (token-driven aspect, default 4:5; `object-fit: cover` by default)
- Badges (sale, low-stock, new — chrome-layer positioning, token-driven corner)
- Vendor eyebrow (gated by `shop.showProductVendor` boolean per existing DB model)
- Title (line-clamp 2)
- Price (current + compare-at when on sale)
- Stock urgency line (existing threshold-driven render)
- Color swatches — **display hint, not buy control**
- A `+` CTA affordance (positioned per token, default `top-right` of image)

The base card does **not** render:
- Size pills
- Stacked option groups
- A full-width Add-to-bag button in `float-pill` CTA mode

### Swatch interaction

A click on a swatch on the base card does exactly two things:

1. Swaps the displayed product image to that color's variant image.
2. Pre-selects that color in `ProductOptions.Root` state.

It does **not** add to cart. It does **not** open the picker. Add-to-cart goes through the CTA, with the color already chosen.

### CTA + picker

`+` click trajectory:

- **Single buyable variant fast-path:** if `product.variants.edges.length === 1` AND `product.variants.edges[0].node.availableForSale === true`, click on `+` adds the variant directly. No picker opens. A green dot on the `+` telegraphs this state. After add, the cart drawer surfaces the add (existing cart-mutation patterns trigger). Cart-add live region announces success.
- **Otherwise:** picker opens, presentation per the routing rule.

### Picker presentation routing

Token: `--product-card-quick-add-presentation` — `auto` | `float` | `sheet` | `inline`.

`auto` derives from card layout, CTA placement, and viewport:

| Card layout | CTA placement | Viewport | Picker presentation |
|---|---|---|---|
| `vertical` | `float-pill` | ≥ `md` | `float` |
| `vertical` | `inline-button` | ≥ `md` | `inline` (replaces button in-place) |
| `horizontal` | any | any | `sheet` |
| any | any | `< md` | `sheet` |

Tenant overrides by setting the token to an explicit value.

### Out-of-stock state

When `product.availableForSale === false` (no buyable variants exist):

- Card opacity `0.7` (token-overrideable; default tightened from existing `0.5` which was too aggressive).
- Image filter `saturate(0.85)`.
- CTA pill `disabled` with tooltip "Sold out".
- A "Sold out" badge replaces the sale badge.
- All swatches and chips inside the card become `pointer-events: none` (no exploration of an unbuyable product).

## Per-surface behavior

Three surfaces. `CartDrawerProductCard` is deleted (zero consumers; cart drawer items are rendered by `CartLine`, which this spec doesn't touch).

| Surface | Layout | Chrome | CTA placement default | Picker presentation default |
|---|---|---|---|---|
| Collection grid | `vertical` | `boxed` | `float-pill` | `auto` (→ float) |
| Recommendations rail | `vertical` | `boxed` | `float-pill` | `auto` (→ float) |
| Search results | `horizontal` | `boxed` (was `bare`) | `float-pill` (right edge of row) | `auto` (→ sheet) |

`SURFACE_PRESETS` constant in `apps/storefront/src/components/product-card/presets.ts`:

```ts
export const SURFACE_PRESETS = {
  collection:     { layout: 'vertical',   chrome: 'boxed', ctaPlacement: 'float-pill', pickerPresentation: 'auto' },
  recommendation: { layout: 'vertical',   chrome: 'boxed', ctaPlacement: 'float-pill', pickerPresentation: 'auto' },
  search:         { layout: 'horizontal', chrome: 'boxed', ctaPlacement: 'float-pill', pickerPresentation: 'auto' },
} as const;
```

Surface wrappers reduce to thin spreads:

```ts
const CollectionProductCard = async (props) => (
  <ProductCard {...SURFACE_PRESETS.collection} {...props} />
);
```

### `layout="micro"` and `chrome="bare"`

- `layout="micro"`: deleted. Zero non-test consumers in the codebase.
- `chrome="bare"`: renamed to `chrome="frameless"`. Kept as an available chrome value even though no default surface uses it — tenants opt into a frame-free card via the token system.
- Layout enum becomes: `vertical | horizontal`.
- Chrome enum becomes: `boxed | frameless`.

### Recommendations carousel — `CollectionBlock` enhancement

`CollectionBlock` (`apps/storefront/src/components/products/collection-block.tsx`) is the existing primitive used by 7+ consumers including `RecommendedProducts`. Enhance it directly:

- When `isHorizontal={true}`, render a `CollectionBlockArrows` client child.
- `CollectionBlockArrows` uses `IntersectionObserver` on the first and last children to drive arrow visibility.
- Arrows hidden when both first and last are visible (rail fits without overflow).
- Arrows show on desktop hover and on keyboard focus.
- Click scrolls one card width via `Element.scrollBy({ left: cardWidth, behavior: 'smooth' })`.
- Touch users get native scroll (arrows hidden on touch via `@media (hover: none)`).
- Add `scroll-padding-inline: var(--product-card-rail-pad)` so snapped cards aren't flush with the container edge.
- Preserve existing `content-visibility-auto` Tailwind utility on `CollectionBlock` (defined in `globals.css:70`). Long horizontal rails benefit significantly from it.

No new `RecommendationsRail` primitive. Consumers don't change.

## Sizing & density

### Grid width bounds

Cards never grow unboundedly. Range target:

| Token | Default |
|---|---|
| `--product-card-min-width` | `200px` |
| `--product-card-max-width` | `240px` |
| `--product-card-grid-align` | `start` |

Grid template:

```css
grid-template-columns: repeat(auto-fit, minmax(var(--product-card-min-width), var(--product-card-max-width)));
justify-content: var(--product-card-grid-align);
```

- Wide viewport → more columns, not wider cards.
- Sparse data (3 items on a wide viewport) → cards left-aligned, intentional empty space on the right. `center` is the alternative tenant value.
- Existing `--page-width` continues to cap the outer container.

### Density bands

**No density bands.** With min/max at 200–240 the card never falls into a band that would justify different typography or padding. The previous "compact / default / comfortable" bands proposed earlier are dropped. Single density.

### Container queries

The previous container-query-driven swatch inline-limit (2/3/4 by width) is dropped. Inline limit is fixed at 4 swatches; `+N` chip handles overflow. Reasoning: with the 240px max width cards never need a sub-4 limit, and the previous DOM-mutation synchronization between `Group` and `More` was the root cause of the `+0` rendering bug.

The remaining `@container` use in `product-card.module.css` (image padding, title font-size at narrow widths) is dropped along with the module — single density removes the need.

### Horizontal switch

The previously proposed horizontal-switch-at-wide-cards mechanism is dropped. With 240px max it never fires.

## Component architecture

### File structure (post-implementation)

```
apps/storefront/src/components/product-card/
├── index.tsx                              [server] · single named re-export of <ProductCard>; primitives imported directly per Vercel bundle-barrel-imports
├── product-card.tsx                       [server async] · orchestrator
├── product-card.test.tsx
├── presets.ts                             [server] · SURFACE_PRESETS constant
├── presets.test.ts
│
├── primitives/
│   ├── product-card-root.tsx              [server] · chassis (layout, chrome, container)
│   ├── product-card-image.tsx             [client] · variant-bound image; initial SSR = seed
│   ├── product-card-badges.tsx            [server] · sale/new/low-stock badges (corner-positioned)
│   ├── product-card-vendor.tsx            [server] · eyebrow gated by shop.showProductVendor
│   ├── product-card-title.tsx             [server] · seed title
│   ├── product-card-price.tsx             [server] · seed price + compare-at
│   ├── product-card-stock-urgency.tsx     [server] · seed urgency line
│   │
│   ├── product-card-options-provider.tsx  [client] · thin Context provider
│   ├── product-card-swatches.tsx          [client] · base-card swatch row (image swap + pre-select)
│   ├── product-card-cta.tsx               [client] · CTA host; reads placement; looks up strategy
│   └── product-card-picker.tsx            [client] · picker host; reads presentation; looks up strategy
│
├── cta/                                   placement registry
│   ├── index.ts                           [client] · module-level Map · register/get
│   ├── float-pill.tsx                     [client]
│   └── inline-button.tsx                  [client]
│
└── picker/                                picker-shape registry
    ├── index.ts                           [client] · module-level Map · register/get
    ├── float.tsx                          [client]
    ├── sheet.tsx                          [client]
    └── inline.tsx                         [client]

apps/storefront/src/components/products/
├── collection-product-card.tsx            [server async]
├── search-product-card.tsx                [server async] · chrome=boxed
├── recommendation-product-card.tsx        [server async]
├── collection-block.tsx                   [server async] · enhanced with arrows-when-horizontal
└── collection-block-arrows.tsx            [client] · IntersectionObserver + scrollBy

apps/storefront/src/components/product-options-selector/
└── (CSS modules deleted; styles ported to Tailwind on the existing TSX files)
```

**Type co-location convention:** No standalone `types.ts` file. Types live next to the component or registry that owns them — `ProductCardData` is exported from `product-card.tsx`, `ProductCardCtaProps` from `cta/index.ts`, per-primitive prop types from each primitive's own file. Cross-package consumers import types from the file that exports the corresponding implementation.

**Deleted files:**
- `apps/storefront/src/components/product-card/product-card.module.css`
- `apps/storefront/src/components/product-card/primitives/product-card-overlay.tsx` (folded into picker primitives; no separate overlay)
- `apps/storefront/src/components/product-card/primitives/product-card-options.tsx` (split into `product-card-swatches.tsx` + picker primitives)
- `apps/storefront/src/components/product-card/primitives/product-card-actions.tsx` (folded into picker CTA)
- `apps/storefront/src/components/product-card/primitives/product-card-actions-client.tsx` (folded into picker CTA)
- `apps/storefront/src/components/products/cart-drawer-product-card.tsx` (zero consumers)
- `apps/storefront/src/components/product-options-selector/product-options-selector.module.css`
- `apps/storefront/src/components/product-options-selector/renderers/chip.module.css`

### RSC layering

```tsx
// product-card.tsx — server async
export default async function ProductCard({ data, shop, locale, layout, chrome, ctaPlacement, pickerPresentation, priority }) {
  const i18n = await getDictionary({ shop, locale });
  const seedVariant = firstAvailableVariant(data) ?? data.variants?.edges?.[0]?.node;
  const isSingleBuyable =
    data.variants.edges.length === 1 &&
    data.variants.edges[0]?.node?.availableForSale === true;

  return (
    <ProductCardOptionsProvider                    {/* CLIENT — thin context */}
      product={data}
      seedVariantId={seedVariant.id}
      isSingleBuyable={isSingleBuyable}
      ctaPlacement={ctaPlacement}
      pickerPresentation={pickerPresentation}
    >
      <ProductCardRoot                             {/* SERVER — chassis */}
        data={data}
        layout={layout}
        chrome={chrome}
      >
        <ProductCardImage product={data} priority={priority} />        {/* CLIENT — variant-bound */}
        <ProductCardBadges data={data} i18n={i18n} />                  {/* SERVER */}
        <ProductCardVendor shop={shop} data={data} />                  {/* SERVER */}
        <ProductCardTitle data={data} />                                {/* SERVER */}
        <ProductCardPrice seedVariant={seedVariant} locale={locale} /> {/* SERVER */}
        <ProductCardStockUrgency seedVariant={seedVariant} i18n={i18n} /> {/* SERVER */}
        <ProductCardSwatches data={data} />                            {/* CLIENT */}
        <ProductCardCta i18n={i18n} />                                 {/* CLIENT */}
        <ProductCardPicker data={data} i18n={i18n} locale={locale} /> {/* CLIENT */}
      </ProductCardRoot>
    </ProductCardOptionsProvider>
  );
}
```

- `ProductCardOptionsProvider` is the only top-level client component. It owns `selectedVariant` and `isPickerOpen` state. Renders nothing visible.
- Server components are passed as `children` to the client provider — legal in RSC; the provider mounts already-rendered server output.
- `ProductCardImage` is client because it re-renders on swatch click. Initial SSR uses the seed variant (matches what the server would have rendered); React handles the post-hydration swap. `next/image` works in both contexts. `priority` continues to drive LCP.

### Provider context split (re-render perf)

The provider in the spec earlier described as a single `ProductCardOptionsProvider` is split into **two** client contexts to prevent picker open/close toggles from re-rendering every variant consumer (Vercel React `rerender-split-combined-hooks`):

```tsx
// product-card/primitives/product-card-options-provider.tsx
'use client';

// Slowly-changing: selection state. Re-renders Image, Swatches, picker-internal chips.
const VariantSelectionContext = createContext<VariantSelectionValue | null>(null);

// Frequently-toggled: picker open/close. Re-renders ONLY the CTA + picker shell.
const PickerOpenContext = createContext<PickerOpenValue | null>(null);

export function ProductCardOptionsProvider({ children, ... }) {
  // Two providers; consumers subscribe only to what they need.
  return (
    <VariantSelectionContext.Provider value={selectionValue}>
      <PickerOpenContext.Provider value={pickerValue}>
        {children}
      </PickerOpenContext.Provider>
    </VariantSelectionContext.Provider>
  );
}

// Selectors that hook into one or the other:
export const useVariantSelection = () => useContext(VariantSelectionContext);
export const usePickerOpen      = () => useContext(PickerOpenContext);
```

### Slim data shape for client

The provider's `product` prop is a slim `ProductCardData` view computed server-side, not the full `Product` (Vercel `server-serialization`). The type is co-located with the orchestrator that shapes it — exported from `product-card.tsx` alongside the orchestrator function, not from a separate `types.ts`:

```ts
// product-card.tsx — same file as the orchestrator
export type ProductCardData = {
  id: string;
  handle: string;
  title: string;
  vendor: string;
  availableForSale: boolean;
  variants: Array<{
    id: string;
    availableForSale: boolean;
    selectedOptions: Array<{ name: string; value: string }>;
    price: { amount: string; currencyCode: string };
    compareAtPrice?: { amount: string; currencyCode: string };
    image?: { url: string; altText: string | null; width: number; height: number };
  }>;
  options: Array<{ name: string; values: string[]; swatchByValue?: Record<string, { color?: string; image?: { url: string } }> }>;
  featuredImage?: { url: string; altText: string | null; width: number; height: number };
  // No prose description, no SEO blocks, no full image gallery, no Shopify-internal fields.
};
```

The orchestrator (server) shapes `data: Product` → `ProductCardData` once before passing to the provider. Saves serialization bytes per card × N cards per page.

### Picker dynamic imports (bundle deferral)

Picker shells bring their own dependencies (`sheet` → Radix Dialog, `float` → Radix Popover). They are NOT on the first paint critical path — they only render when the user activates the CTA. Use `next/dynamic` (Vercel `bundle-dynamic-imports`):

```tsx
// product-card/picker/index.ts
'use client';
import dynamic from 'next/dynamic';

// Defer picker dependencies until first activation. SSR disabled — pickers are interactive only.
const FloatPicker  = dynamic(() => import('./float'),  { ssr: false });
const SheetPicker  = dynamic(() => import('./sheet'),  { ssr: false });
const InlinePicker = dynamic(() => import('./inline'), { ssr: false });

const registry = new Map<string, ProductCardPickerComponent>();
registry.set('float',  FloatPicker);
registry.set('sheet',  SheetPicker);
registry.set('inline', InlinePicker);
```

Same `next/dynamic` pattern not needed for CTA strategies — they DO render on first paint. CTA registry stays static-imported.

### Registry pattern

Module-level `Map`, register at module-init time:

```ts
// product-card/cta/index.ts
'use client';

import type { ComponentType } from 'react';

export type ProductCardCtaProps = {
  productHandle: string;
  seedVariantId: string;
  isSingleBuyable: boolean;
  i18n: Dictionary;
  onActivate: () => void;
  onAdd: () => void;
  isOpen: boolean;
};

export type ProductCardCtaComponent = ComponentType<ProductCardCtaProps>;

const registry = new Map<string, ProductCardCtaComponent>();
export function registerProductCardCta(name: string, component: ProductCardCtaComponent) { registry.set(name, component); }
export function getProductCardCta(name: string): ProductCardCtaComponent {
  return registry.get(name) ?? registry.get('float-pill')!;
}

import FloatPill from './float-pill';
import InlineButton from './inline-button';
registerProductCardCta('float-pill', FloatPill);
registerProductCardCta('inline-button', InlineButton);
```

Identical pattern for `picker/index.ts` with `float | sheet | inline` registered by default.

- Same `Map` instance per process (Next.js dedupes modules by import path).
- Not tenant-specific — tenants override tokens, registry is global.
- Third-party packages registering new strategies do so from side-effecting modules imported at app init.
- No React context for the registry. No tenant-specific registry overlay (additive extension if ever needed; not built now).

## Primitive design baseline

Defaults that match the existing site voice. All visual choices are token-exposed; tenants override under `[data-shop="…"]` when the customization system lands.

### Typography

- Title: weight 500, line-height 1.35, 14px, line-clamp 2.
- Vendor eyebrow + sale badge (shared): weight 600, tracking 0.14em, uppercase, 11px. Both reference shared `--product-card-eyebrow-*` tokens.
- Price: weight 600, `font-variant-numeric: tabular-nums`, 14px.
- Compare price: weight 500, muted, **strike drawn via `::after` pseudo-element, never `text-decoration: line-through`** (cleaner with tabular-nums; respects line-height).
- Urgency: 11px, weight 500.

### Motion

One easing curve, four durations. Every transition wrapped in `motion-safe:` so `prefers-reduced-motion: reduce` drops all transforms (opacity transitions stay; they're functional).

| Token | Default | Used for |
|---|---|---|
| `--product-card-motion-ease` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Sole easing curve — quick out, slow settle |
| `--product-card-motion-fast` | `80ms` | Press feedback (scale-down) |
| `--product-card-motion-base` | `160ms` | Hover, focus, swatch scale, chip selection |
| `--product-card-motion-picker-in` | `220ms` | Picker open (`opacity 0→1 + translateY(4px)→0`) |
| `--product-card-motion-picker-out` | `180ms` | Picker close (faster than open, feels responsive) |

### Swatch

- 16px visual diameter, **36px hit target** (cleans WCAG 2.5.5).
- Border: 1px `currentColor / 10%` — works on any tile bg without per-theme recolor.
- Selected: 2px ring at 2px offset, ring color `currentColor`.
- Unavailable: diagonal strike via inline SVG inside the visual.
- Hover: `scale(1.08)`. Press: `scale(0.94)`. Focus-visible: 2px outline at 2px offset, `--accent` color.

### Chip (inside picker only — never on base card)

- Padding: `8px 12px`. Radius: `var(--product-card-radius-sm)` (4px).
- Border: 1px `currentColor / 10%`. Selected: filled with `--accent`, inverse text.
- Unavailable: dimmed (50% opacity) + diagonal strike line drawn via `::after`. `pointer-events: none`.
- Same hover/press scale as Swatch.

### `+N` chip

- Same dimensions as Chip. Distinct bg `--product-card-more-bg` (warm tile).
- Font size `var(--product-card-eyebrow-size)`, weight 600, tabular-nums.
- Aria-label `Show all {groupName} options`.
- **Pure JSX render** — no `useEffect`, no DOM mutation. Computed in `More` component from `Math.max(0, group.values.length - 4)`. `if (overflow === 0) return null;` short-circuit.

### CTA — `float-pill`

- 36px diameter (icon-only) or auto-width with 12px padding (icon+text).
- Bg `rgb(255 255 255 / 0.95)`, 1px border `currentColor / 8%`.
- Shadow on rest `0 6px 16px -8px rgb(20 17 11 / 0.25)`. Hover: shadow grows by 4px.
- Icon: 16px stroke 2px (Lucide `Plus`).
- Single-buyable green dot: 9px circle, `--product-card-fast-path-dot` (default `#2f7d4a`), bottom-right, 2px white outline.

### CTA — `inline-button`

- Full-width, 44px height. Padding `0 16px`. Radius `var(--product-card-cta-radius)` (8px).
- Solid: bg `--product-card-cta-bg` (default `#14110b`), fg `--product-card-cta-color` (default `#ffffff`).
- Ghost: transparent bg, 1px border in CTA bg color.
- Hover: bg shifts via `color-mix(in srgb, var(--product-card-cta-bg) 92%, white 8%)`.
- Press: `scale(0.99)`.

### Picker shells

| Shape | Background | Backdrop | Open animation |
|---|---|---|---|
| `float` | `rgb(255 255 255 / 0.97)` + `backdrop-filter: blur(10px)` | none | `opacity 0→1 + translateY(4px)→0`, 220ms |
| `sheet` (mobile) | solid white | scrim `rgb(20 17 11 / 0.32)` | `opacity 0→1 + translateY(20px)→0`, 220ms; drag-handle visible |
| `sheet` (desktop) | solid white | scrim same | `opacity 0→1 + scale(0.98)→1`, 220ms |
| `inline` | `--product-card-more-bg` | none | height cross-fade, 220ms |

Close animation 180ms (faster than open) for all shapes.

### Card chassis

- `boxed`: white bg, 1px hairline border, 12px radius, 12px padding, shadow `0 1px 2px rgb(20 17 11 / 4%)`. Hover/focus-within shadow grows to `0 8px 24px -10px rgb(20 17 11 / 22%)`. **No transform on hover** — lift via shadow only.
- `frameless`: transparent bg, no border, no shadow, no padding. Content sits flush with parent context.

### Image

- 4:5 aspect (`--aspect-product-card-vertical` token). Tile bg `--product-card-image-bg`.
- `object-fit: cover` by default. Tenants opt to `contain` via `--product-card-image-fit`.
- Hover image swap: 400ms crossfade via stacked `<Image>` elements when `images[1]` exists. Gated by `--product-card-image-hover-swap: on | off` (default `on`); set to `off` to skip the second `<Image>` render entirely.

### Out-of-stock

- Card opacity `0.7` (token: `--product-card-oos-opacity`).
- Image `filter: saturate(0.85)` (token: `--product-card-oos-image-saturate`).
- CTA disabled with tooltip "Sold out".
- "Sold out" badge replaces sale badge.

## Sale state

Three independently layerable concerns.

### 1. Style (required)

Token: `--product-card-sale-style` — enum, registry-extensible.

- `strike-only` (default) — angled strike on compare-price, no badge.
- `strike-and-badge` — strike on compare-price plus a badge in a corner of the image.

Both styles share the same strike rule:

```css
.compare::after {
  content: "";
  position: absolute; inset: 50% calc(var(--product-card-sale-strike-extend) * -1) auto calc(var(--product-card-sale-strike-extend) * -1);
  height: 1.5px; background: var(--product-card-sale-strike-color, currentColor);
  transform: translateY(-50%) rotate(var(--product-card-sale-strike-angle));
}
```

Drawn line, never `text-decoration`. Works with tabular-nums, respects line-height, scales with font-size.

### 2. Current-price color (optional)

Token: `--product-card-sale-current-color`.

- Default: `inherit` — no tint, price stays in title color.
- Tenants override to `--accent`, brand color, or red for stronger sale signal. Layers onto either style.

### 3. Savings line (optional)

Token: `--product-card-sale-show-savings-line` — `on` | `off`. Default `off`.

When `on`, renders "You save $X" beneath the price row in `--product-card-sale-current-color` (or `currentColor` if not set).

### Badge styles (enumerated)

Token: `--product-card-sale-badge-style` — closed enum, four values. Each derives colors from existing tokens (no raw color knobs on the badge).

| Style | bg | color | border |
|---|---|---|---|
| `default` | `var(--product-card-bg)` | `var(--product-card-title-color)` | `1px solid var(--product-card-border-color)` — inherits whatever the tenant sets for the card |
| `inverse` | `var(--product-card-title-color)` | `var(--product-card-bg)` | `1px solid var(--product-card-title-color)` — inverse of `default` |
| `accent` | `var(--accent)` | `var(--accent-foreground)` | `1px solid var(--accent)` |
| `sales-color` | `var(--product-card-sale-current-color)` | `var(--accent-foreground)` | `1px solid var(--product-card-sale-current-color)` |

Badge typography always inherits from `--product-card-eyebrow-*` tokens (shared with vendor eyebrow). Radius inherits from `--product-card-radius-sm`. No badge-specific typography or radius tokens.

### Badge & CTA positioning

Both badge and CTA pill have independent corner-position tokens:

| Token | Default |
|---|---|
| `--product-card-sale-badge-position` | `top-left` |
| `--product-card-cta-pill-position` | `top-right` |

Values: `top-left | top-right | bottom-left | bottom-right`.

**Collision rule:** if `--product-card-sale-badge-position === --product-card-cta-pill-position` and `--product-card-sale-badge-allow-overlap === false` (default), the badge auto-shifts horizontally by `cta-width + 8px` to avoid overlap. Tenants who want them in the same corner without shifting set `--product-card-sale-badge-allow-overlap: true`.

### Badge content & threshold

| Token | Default |
|---|---|
| `--product-card-sale-badge-text` | `−{n}%` |
| `--product-card-sale-badge-min-discount` | `11` |

- `{n}` interpolates the rounded discount percent.
- Below the min-discount threshold the badge is suppressed (strike still draws).

## Interaction & accessibility

### Selection & touch
- `user-select: none` on every interactive primitive.
- `user-select: text` on text content (title, price, vendor).
- `-webkit-tap-highlight-color: transparent` on every interactive primitive.
- `touch-action: manipulation` on swatches, chips, CTA pill, More chip.
- `touch-action: pan-y` on card root and rail container.

### Focus
- `focus:outline-none` on every interactive primitive (suppress default).
- `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]` — keyboard-only ring.
- `focus-within:shadow-(--product-card-shadow-hover)` on card chassis — keyboard users get clear "active card" feedback.

### Cursor
- Default `pointer` for buttons/anchors (browser default).
- `cursor: not-allowed` on disabled controls (paired with `pointer-events: none` + `aria-disabled="true"`).

### Hover & press (all `motion-safe:`)
- Swatches/chips: `hover:scale-1.08`, `active:scale-0.94` (faster duration on press).
- More chip: `hover:scale-1.03`, `active:scale-0.97`.
- Card chassis: shadow elevation only, no transform.

### ARIA
- `aria-label` on every icon-only control (swatches use color name; CTA uses "Quick add" or "Add to bag · {price}" for fast-path).
- `aria-pressed` on swatches/chips for toggle state.
- `aria-expanded` + `aria-controls` on CTA when picker is open.
- `aria-haspopup="dialog"` on CTA when presentation routes to `sheet`.
- `aria-disabled="true"` (in addition to `disabled`) on unavailable controls.
- `aria-hidden="true"` + `tabindex="-1"` on the image-overlay PDP link (title link is the canonical focus target; no double rings).
- `aria-live="polite"` regions for variant swap announcements and cart-add success.

### Picker (any shape)
- **Sheet** uses `@/components/layout/modal.tsx` (Radix Dialog wrapper already in the codebase). Provides `role="dialog"`, `aria-modal="true"`, focus trap, scroll lock, ESC + backdrop close, focus restoration on close — all out of the box.
- **Float** uses `@/components/layout/popover.tsx` (Radix Popover wrapper). Provides `role="dialog"`, focus trap, ESC + outside-click close.
- **Inline** is not a modal — it's an in-place expansion of the CTA slot. Manual ARIA: `role="group"`, `aria-labelledby` to the picker heading. Focus management is local: focus moves to first chip on open; on close (X button or successful add), focus returns to the CTA. No body scroll lock (it's part of the page flow).
- `aria-labelledby` points to picker heading in all shapes.
- Initial focus: first interactive element inside picker (typically first size chip).

### Forced colors / Windows High Contrast
- Use Tailwind `forced-colors:` variant where needed.
- Borders remain visible when colors are forced.
- Focus rings preserved.

### Keyboard model
- Tab per card: title link → swatches → CTA → next card.
- Arrow keys inside picker traverse chips/swatches (via existing `ProductOptions` primitives).
- Enter/Space activates buttons.
- Modifier keys (Cmd-Click / Ctrl-Click) on title link work as expected.

### Reduced motion
- All transitions wrapped in `motion-safe:`.
- `prefers-reduced-motion: reduce`: drops transforms; opacity fades remain.

### Pointer-events / disabled
- Unavailable swatches/chips: `pointer-events: none` + `aria-disabled` + strike + dim.
- OOS CTA: `disabled` HTML attribute + `pointer-events: none` + opacity 0.45 + `cursor: not-allowed`.
- Card during cart-mutation pending: `*:pointer-events-none` + opacity 0.5 on the CTA (existing pattern from `cart-line.tsx`).

## Skeletons

Each primitive exports its own `.skeleton` static. The chassis and surface wrappers compose primitive skeletons. Heights stay in sync because skeleton CSS uses the same tokens the live primitive uses.

Project convention: every skeleton piece gets a plain `data-skeleton` attribute. The global rule at `globals.css:440-476` provides bg color, border radius, shimmer animation, and reduced-motion handling. No per-component skeleton tokens — same pattern as `product-description.tsx`, `footer.tsx`, `info-lines.tsx`.

```tsx
ProductCardImage.skeleton = ({ aspect = 'vertical' }) => (
  <div
    data-skeleton
    className="rounded-(--product-card-image-radius)"
    style={{ aspectRatio: `var(--aspect-product-card-${aspect})` }}
  />
);

ProductCardTitle.skeleton = () => (
  <div
    className="flex flex-col gap-1"
    style={{ height: `calc(var(--product-card-title-line-height) * var(--product-card-title-line-clamp))` }}
  >
    <span data-skeleton className="h-(--product-card-title-line-height) w-4/5" />
    <span data-skeleton className="h-(--product-card-title-line-height) w-3/5" />
  </div>
);
```

Pattern repeats for `ProductCardPrice.skeleton`, `ProductCardSwatches.skeleton`, `ProductCardVendor.skeleton`, `ProductCardCta.skeleton` — each gets `data-skeleton` on the element and sizing tokens via Tailwind utility classes. No color/animation tokens needed; the global rule covers them.

The chassis composes:

```tsx
ProductCard.skeleton = ({ layout = 'vertical', chrome = 'boxed', ctaPlacement = 'float-pill' }) => (
  <article data-testid="product-card-root" data-skeleton className={chassisClasses({ layout, chrome })}>
    <ProductCardImage.skeleton aspect={layout === 'horizontal' ? 'horizontal' : 'vertical'} />
    <ProductCardVendor.skeleton />
    <ProductCardTitle.skeleton />
    <ProductCardPrice.skeleton />
    <ProductCardSwatches.skeleton />
    {ctaPlacement === 'inline-button' && <ProductCardCta.skeleton placement={ctaPlacement} />}
  </article>
);
```

Per-surface skeletons compose differently for horizontal layouts:

```tsx
SearchProductCard.skeleton = () => (
  <article data-testid="product-card-root" data-skeleton className={chassisClasses({ layout: 'horizontal', chrome: 'boxed' })}>
    <div className="w-(--product-card-search-image-width) shrink-0">
      <ProductCardImage.skeleton aspect="horizontal" />
    </div>
    <div className="flex-1 min-w-0 flex flex-col gap-1">
      <ProductCardVendor.skeleton />
      <ProductCardTitle.skeleton />
      <ProductCardSwatches.skeleton />
    </div>
    <div className="shrink-0 flex flex-col items-end justify-between gap-2">
      <ProductCardPrice.skeleton />
      <ProductCardCta.skeleton placement="float-pill" />
    </div>
  </article>
);
```

### Skeleton tokens

**None.** Skeleton appearance is owned by the global `[data-skeleton]` rule in `globals.css:440-476`. The rule provides bg color, border radius, shimmer animation, and the existing reduced-motion behavior is already inherited from the keyframe. If a future spec wants per-shop skeleton overrides, the global rule can read from `--skeleton-*` tokens at that point — out of scope here.

### Guarantees

- **No CLS** between skeleton and live render — same chassis class, same primitives, same height tokens.
- **No skeleton-specific size tokens** — heights derive from the live primitive's height tokens.
- **`motion-safe:animate-pulse`** respects `prefers-reduced-motion`.
- **`data-skeleton` attribute** on the chassis lets E2E tests assert skeleton-vs-live state.

## Full token surface

Tokens added or modified by this spec. Existing tokens not listed here retain their current defaults.

### Chassis & layout

| Token | Default |
|---|---|
| `--product-card-min-width` | `200px` |
| `--product-card-max-width` | `240px` |
| `--product-card-grid-align` | `start` |
| `--product-card-radius-sm` | `4px` |
| `--product-card-search-image-width` | `72px` (image width for the horizontal search-row card) |

### Eyebrow typography (shared by vendor + sale badge)

| Token | Default |
|---|---|
| `--product-card-eyebrow-size` | `11px` |
| `--product-card-eyebrow-weight` | `600` |
| `--product-card-eyebrow-tracking` | `0.14em` |
| `--product-card-eyebrow-transform` | `uppercase` |

### Title / price

| Token | Default |
|---|---|
| `--product-card-title-line-height` | `calc(1.35 * var(--product-card-title-size))` |
| `--product-card-price-line-height` | `var(--product-card-price-size)` |

### Image

| Token | Default |
|---|---|
| `--product-card-image-fit` | `cover` (changed from existing `contain` — behavioral change) |
| `--product-card-image-hover-swap` | `on` |
| `--product-card-image-sizes` | `(max-width: 768px) 50vw, 240px` (calibrated for new max-width) |

### Motion

| Token | Default |
|---|---|
| `--product-card-motion-ease` | `cubic-bezier(0.2, 0.8, 0.2, 1)` |
| `--product-card-motion-fast` | `80ms` |
| `--product-card-motion-base` | `160ms` |
| `--product-card-motion-picker-in` | `220ms` |
| `--product-card-motion-picker-out` | `180ms` |

### CTA

| Token | Default |
|---|---|
| `--product-card-cta-placement` | `float-pill` |
| `--product-card-cta-pill-position` | `top-right` |
| `--product-card-cta-pill-label` | empty (icon-only) |
| `--product-card-cta-pill-icon` | `+` |
| `--product-card-cta-pill-reveal` | `always` (alt: `hover` on desktop) |
| `--product-card-cta-inline-label` | i18n `Add to bag` |
| `--product-card-cta-inline-style` | `solid` (alt: `ghost`) |
| `--product-card-cta-radius` | `8px` |
| `--product-card-fast-path-dot` | `#2f7d4a` |
| `--product-card-fast-path-single-variant` | `on` |

### Picker

| Token | Default |
|---|---|
| `--product-card-quick-add-presentation` | `auto` |

### Rail (CollectionBlock arrows)

| Token | Default |
|---|---|
| `--product-card-rail-pad` | `14px` |
| `--product-card-rail-gap` | `14px` |

### Out-of-stock

| Token | Default |
|---|---|
| `--product-card-oos-opacity` | `0.7` |
| `--product-card-oos-image-saturate` | `0.85` |

### Sale

| Token | Default |
|---|---|
| `--product-card-sale-style` | `strike-only` |
| `--product-card-sale-strike-color` | inherit from compare text |
| `--product-card-sale-strike-angle` | `-8deg` |
| `--product-card-sale-strike-extend` | `2px` |
| `--product-card-sale-current-color` | `inherit` |
| `--product-card-sale-show-savings-line` | `off` |
| `--product-card-sale-badge-style` | `default` |
| `--product-card-sale-badge-position` | `top-left` |
| `--product-card-sale-badge-text` | `−{n}%` |
| `--product-card-sale-badge-min-discount` | `11` |
| `--product-card-sale-badge-allow-overlap` | `false` |

### Skeleton

No spec-local tokens. Uses the global `[data-skeleton]` rule (`globals.css:440-476`). Skeleton pieces are plain elements with `data-skeleton` + sizing utility classes.

## Visual reference

Visual demos saved alongside this spec under `.specs/2026-05-26-product-card-redesign/visuals/`. Open in a browser for an interactive walkthrough of every state.

| File | Demonstrates |
|---|---|
| `visuals/00-overview.html` | All primitives + states + sale variants + surfaces + sizing + tokens + accessibility — single anchor-linked page |
| `visuals/01-interaction-philosophy.html` | Mini-PDP vs browse-tile vs hybrid (the scoping decision) |
| `visuals/02-interaction-model.html` | Three states: closed, float picker open, sheet picker open |
| `visuals/03-cta-placement.html` | `float-pill` vs `inline-button` CTA mode, each in closed + open states |
| `visuals/04-picker-mechanics.html` | Inline-grow vs float-over-image vs sheet (mechanic decision) |
| `visuals/05-primitives.html` | Per-primitive specimens — every state, every variant |
| `visuals/06-sale-state.html` | Strike-only vs strike-and-badge, four badge styles, positioning + collision, current-color, savings line |
| `visuals/07-surfaces.html` | Collection grid, search rows, recommendations rail in realistic compositions |
| `visuals/08-sizing.html` | Cards at narrow / tablet / desktop viewports + sparse-data alignment |

### Canonical CSS — primitives

These are the rendered-CSS outputs the Tailwind implementation must produce. During Phase 3 + 4 implementation, the Tailwind utility class strings should compile to equivalent rules. Tokens are read with Tailwind 4's `bg-(--token)` / `text-(color:var(--token))` / `rounded-(--token)` syntax (confirmed against `tailwindcss@4.3.0`).

#### Card chassis

```css
.product-card {
  background: var(--product-card-bg);
  border: var(--product-card-border-width) solid var(--product-card-border-color);
  border-radius: var(--product-card-radius);
  padding: var(--product-card-padding);
  box-shadow: var(--product-card-shadow);
  transition: box-shadow var(--product-card-motion-base) var(--product-card-motion-ease);
  display: flex;
  flex-direction: column;
  gap: var(--product-card-gap);
  position: relative;
}
.product-card:hover,
.product-card:focus-within {
  box-shadow: var(--product-card-shadow-hover);
}
.product-card[data-chrome="frameless"] {
  background: transparent;
  border: 0;
  padding: 0;
  box-shadow: none;
}
.product-card[data-availability="out-of-stock"] {
  opacity: var(--product-card-oos-opacity);
}
```

#### Image container

```css
.product-card__media {
  position: relative;
  background: var(--product-card-image-bg);
  border-radius: var(--product-card-image-radius);
  aspect-ratio: var(--aspect-product-card-vertical);
  overflow: hidden;
}
.product-card__media img {
  width: 100%;
  height: 100%;
  object-fit: var(--product-card-image-fit); /* default cover */
  display: block;
}
.product-card[data-availability="out-of-stock"] .product-card__media img {
  filter: saturate(var(--product-card-oos-image-saturate));
}
```

#### Eyebrow (shared by vendor + sale badge)

```css
.product-card__eyebrow {
  font-family: ui-sans-serif, system-ui;
  font-size: var(--product-card-eyebrow-size);
  font-weight: var(--product-card-eyebrow-weight);
  letter-spacing: var(--product-card-eyebrow-tracking);
  text-transform: var(--product-card-eyebrow-transform);
  line-height: 1;
}
.product-card__vendor { color: var(--product-card-vendor-color); }
```

#### Title

```css
.product-card__title {
  font: var(--product-card-title-weight) var(--product-card-title-size)/1.35 ui-sans-serif;
  color: var(--product-card-title-color);
  display: -webkit-box;
  -webkit-line-clamp: var(--product-card-title-line-clamp);
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

#### Price + compare (with drawn angled strike)

```css
.product-card__price {
  font: var(--product-card-price-weight) var(--product-card-price-size)/1 ui-sans-serif;
  color: var(--product-card-price-color);
  font-variant-numeric: tabular-nums;
}
.product-card__compare {
  font: 500 12px/1 ui-sans-serif;
  color: var(--product-card-compare-color);
  font-variant-numeric: tabular-nums;
  position: relative;
  padding: 0 var(--product-card-sale-strike-extend);
}
.product-card__compare::after {
  content: "";
  position: absolute;
  inset: 50% calc(var(--product-card-sale-strike-extend) * -1) auto calc(var(--product-card-sale-strike-extend) * -1);
  height: 1.5px;
  background: var(--product-card-sale-strike-color, currentColor);
  transform: translateY(-50%) rotate(var(--product-card-sale-strike-angle));
}
.product-card[data-on-sale] .product-card__price {
  color: var(--product-card-sale-current-color, currentColor);
}
```

#### Swatch (16px visual, 36px hit, focus + selected + unavailable)

```css
.product-card-swatch {
  position: relative;
  width: calc(var(--product-card-swatch-size) + var(--product-card-swatch-hit-padding) * 2);
  height: calc(var(--product-card-swatch-size) + var(--product-card-swatch-hit-padding) * 2);
  margin: calc(var(--product-card-swatch-hit-padding) * -1);
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  transition: transform var(--product-card-motion-base) var(--product-card-motion-ease);
}
@media (prefers-reduced-motion: no-preference) {
  .product-card-swatch:hover { transform: scale(1.08); }
  .product-card-swatch:active {
    transform: scale(0.94);
    transition-duration: var(--product-card-motion-fast);
  }
}
.product-card-swatch:focus { outline: none; }
.product-card-swatch:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 6px;
}
.product-card-swatch__visual {
  width: var(--product-card-swatch-size);
  height: var(--product-card-swatch-size);
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, currentColor 10%, transparent);
  position: relative;
}
.product-card-swatch[data-selected] .product-card-swatch__visual {
  box-shadow:
    0 0 0 2px var(--product-card-bg),
    0 0 0 3.5px var(--product-card-swatch-ring-color);
}
.product-card-swatch[data-unavailable] {
  pointer-events: none;
}
.product-card-swatch[data-unavailable] .product-card-swatch__visual::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top right,
    transparent calc(50% - 0.5px),
    currentColor calc(50% - 0.5px),
    currentColor calc(50% + 0.5px),
    transparent calc(50% + 0.5px)
  );
  opacity: 0.55;
}
```

#### Chip (picker-only)

```css
.product-card-chip {
  font: 500 12px/1 ui-sans-serif;
  padding: 8px 12px;
  border-radius: var(--product-card-radius-sm);
  border: 1px solid color-mix(in srgb, currentColor 10%, transparent);
  background: var(--product-card-chip-bg);
  color: var(--product-card-chip-color);
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  position: relative;
  overflow: hidden;
  transition:
    transform var(--product-card-motion-base) var(--product-card-motion-ease),
    background var(--product-card-motion-base) var(--product-card-motion-ease);
}
@media (prefers-reduced-motion: no-preference) {
  .product-card-chip:hover { transform: scale(1.04); }
  .product-card-chip:active {
    transform: scale(0.96);
    transition-duration: var(--product-card-motion-fast);
  }
}
.product-card-chip:focus { outline: none; }
.product-card-chip:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.product-card-chip[data-selected] {
  background: var(--product-card-chip-active-bg);
  color: var(--product-card-chip-active-color);
  border-color: var(--product-card-chip-active-bg);
}
.product-card-chip[data-unavailable] {
  color: color-mix(in srgb, var(--product-card-chip-color) 50%, transparent);
  pointer-events: none;
}
.product-card-chip[data-unavailable]::after {
  content: "";
  position: absolute;
  left: 8px;
  right: 8px;
  top: 50%;
  height: 1px;
  background: currentColor;
  opacity: 0.4;
}
```

#### +N chip (overflow)

```css
.product-card-more {
  font: 600 var(--product-card-more-size)/1 ui-sans-serif;
  padding: 8px 10px;
  border-radius: var(--product-card-radius-sm);
  border: 0;
  background: var(--product-card-more-bg);
  color: var(--product-card-more-color);
  cursor: pointer;
  font-variant-numeric: tabular-nums;
  min-height: 36px;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  transition:
    background var(--product-card-motion-base) var(--product-card-motion-ease),
    transform var(--product-card-motion-base) var(--product-card-motion-ease);
}
@media (prefers-reduced-motion: no-preference) {
  .product-card-more:hover {
    background: color-mix(in srgb, var(--product-card-more-bg) 96%, black 4%);
    transform: scale(1.03);
  }
  .product-card-more:active {
    transform: scale(0.97);
    transition-duration: var(--product-card-motion-fast);
  }
}
```

#### CTA float-pill

```css
.product-card-cta-pill {
  position: absolute;
  height: 36px;
  min-width: 36px;
  width: 36px;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.95);
  color: var(--product-card-title-color);
  border: 1px solid color-mix(in srgb, currentColor 8%, transparent);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0;
  font: 600 12px/1 ui-sans-serif;
  cursor: pointer;
  box-shadow: 0 6px 16px -8px rgb(20 17 11 / 0.25);
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  z-index: 3;
  transition:
    box-shadow var(--product-card-motion-base) var(--product-card-motion-ease),
    transform var(--product-card-motion-base) var(--product-card-motion-ease);
}
.product-card-cta-pill[data-with-text] {
  padding: 0 12px 0 10px;
  width: auto;
}
.product-card-cta-pill[data-fast-path]::after {
  content: "";
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 9px;
  height: 9px;
  border-radius: 99px;
  background: var(--product-card-fast-path-dot);
  border: 2px solid var(--product-card-bg);
}
.product-card-cta-pill[disabled] {
  pointer-events: none;
  opacity: 0.45;
  box-shadow: none;
  cursor: not-allowed;
}
@media (prefers-reduced-motion: no-preference) {
  .product-card-cta-pill:hover { box-shadow: 0 10px 22px -8px rgb(20 17 11 / 0.30); }
  .product-card-cta-pill:active {
    transform: scale(0.96);
    transition-duration: var(--product-card-motion-fast);
  }
}
.product-card-cta-pill:focus { outline: none; }
.product-card-cta-pill:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Positions */
.product-card-cta-pill[data-position="top-right"]    { top: 10px;    right: 10px; }
.product-card-cta-pill[data-position="top-left"]     { top: 10px;    left: 10px; }
.product-card-cta-pill[data-position="bottom-right"] { bottom: 10px; right: 10px; }
.product-card-cta-pill[data-position="bottom-left"]  { bottom: 10px; left: 10px; }
```

#### CTA inline-button

```css
.product-card-cta-inline {
  height: 44px;
  padding: 0 16px;
  border-radius: var(--product-card-cta-radius);
  border: 0;
  background: var(--product-card-cta-bg);
  color: var(--product-card-cta-color);
  font: 600 13px/1 ui-sans-serif;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  transition:
    background var(--product-card-motion-base) var(--product-card-motion-ease),
    transform var(--product-card-motion-base) var(--product-card-motion-ease);
}
.product-card-cta-inline[data-style="ghost"] {
  background: transparent;
  color: var(--product-card-cta-bg);
  border: 1px solid var(--product-card-cta-bg);
}
.product-card-cta-inline[data-style="ghost"]:hover {
  background: color-mix(in srgb, var(--product-card-cta-bg) 6%, transparent);
}
.product-card-cta-inline[disabled] {
  opacity: 0.45;
  pointer-events: none;
  cursor: not-allowed;
}
@media (prefers-reduced-motion: no-preference) {
  .product-card-cta-inline:hover {
    background: color-mix(in srgb, var(--product-card-cta-bg) 92%, white 8%);
  }
  .product-card-cta-inline:active {
    transform: scale(0.99);
    transition-duration: var(--product-card-motion-fast);
  }
}
```

#### Sale badges (4 styles)

```css
.product-card-sale-badge {
  position: absolute;
  z-index: 2;
  padding: 5px 8px;
  border-radius: var(--product-card-radius-sm);
  font-family: ui-sans-serif, system-ui;
  font-size: var(--product-card-eyebrow-size);
  font-weight: var(--product-card-eyebrow-weight);
  letter-spacing: var(--product-card-eyebrow-tracking);
  text-transform: var(--product-card-eyebrow-transform);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.product-card-sale-badge[data-style="default"] {
  background: var(--product-card-bg);
  color: var(--product-card-title-color);
  border: 1px solid var(--product-card-border-color);
}
.product-card-sale-badge[data-style="inverse"] {
  background: var(--product-card-title-color);
  color: var(--product-card-bg);
  border: 1px solid var(--product-card-title-color);
}
.product-card-sale-badge[data-style="accent"] {
  background: var(--accent);
  color: var(--accent-foreground);
  border: 1px solid var(--accent);
}
.product-card-sale-badge[data-style="sales-color"] {
  background: var(--product-card-sale-current-color);
  color: var(--accent-foreground);
  border: 1px solid var(--product-card-sale-current-color);
}

/* Positions match CTA pill enum */
.product-card-sale-badge[data-position="top-left"]     { top: 10px;    left: 10px; }
.product-card-sale-badge[data-position="top-right"]    { top: 10px;    right: 10px; }
.product-card-sale-badge[data-position="bottom-left"]  { bottom: 10px; left: 10px; }
.product-card-sale-badge[data-position="bottom-right"] { bottom: 10px; right: 10px; }

/* Collision auto-shift: when both badge and CTA target same corner, badge shifts horizontally */
.product-card-sale-badge[data-collision-shift] {
  /* shift = cta-width + 8px gap */
  --shift: calc(36px + 8px);
}
.product-card-sale-badge[data-collision-shift][data-position="top-right"]    { right: calc(10px + var(--shift)); }
.product-card-sale-badge[data-collision-shift][data-position="top-left"]     { left:  calc(10px + var(--shift)); }
.product-card-sale-badge[data-collision-shift][data-position="bottom-right"] { right: calc(10px + var(--shift)); }
.product-card-sale-badge[data-collision-shift][data-position="bottom-left"]  { left:  calc(10px + var(--shift)); }
```

#### Picker shells

```css
/* Float — anchored over image, backdrop blur */
.product-card-picker-float {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  z-index: 5;
  background: rgb(255 255 255 / 0.97);
  backdrop-filter: blur(10px);
  border: 1px solid rgb(20 17 11 / 0.06);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 12px 28px -10px rgb(20 17 11 / 0.22);
}

/* Sheet — mobile (bottom-anchored with drag handle) */
.product-card-picker-sheet[data-viewport="mobile"] {
  width: 100%;
  padding: 16px 16px 20px;
  background: #fff;
  border: 1px solid var(--product-card-border-color);
  border-radius: 14px 14px 0 0;
  box-shadow: 0 -12px 32px -8px rgb(20 17 11 / 0.15);
  position: relative;
}
.product-card-picker-sheet[data-viewport="mobile"]::before {
  content: "";
  position: absolute;
  top: 8px;
  left: 50%;
  width: 32px;
  height: 3px;
  background: #ddd;
  border-radius: 99px;
  transform: translateX(-50%);
}

/* Sheet — desktop (centered dialog) */
.product-card-picker-sheet[data-viewport="desktop"] {
  width: 280px;
  padding: 18px;
  background: #fff;
  border: 1px solid var(--product-card-border-color);
  border-radius: 14px;
  box-shadow: 0 16px 36px -12px rgb(20 17 11 / 0.28);
}

/* Inline — replaces CTA slot */
.product-card-picker-inline {
  padding: 12px;
  background: var(--product-card-more-bg);
  border: 1px solid var(--product-card-border-color);
  border-radius: var(--product-card-cta-radius);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Picker contents */
.product-card-picker__label {
  font-family: ui-sans-serif, system-ui;
  font-size: 10px;
  font-weight: var(--product-card-eyebrow-weight);
  letter-spacing: var(--product-card-eyebrow-tracking);
  text-transform: var(--product-card-eyebrow-transform);
  color: var(--product-card-vendor-color);
  margin: 0 0 6px;
}
.product-card-picker__cta {
  background: var(--product-card-cta-bg);
  color: var(--product-card-cta-color);
  border: 0;
  border-radius: var(--product-card-cta-radius);
  padding: 12px;
  font: 600 12px/1 ui-sans-serif;
  cursor: pointer;
  font-variant-numeric: tabular-nums;
}
```

#### Skeleton

No spec-local CSS for skeleton appearance. Use plain `data-skeleton` attribute on each piece — the global `[data-skeleton]` rule at `globals.css:440-476` handles bg color, border radius, shimmer animation, and reduced-motion. Only sizing utilities are added at the call site (matched to live primitive heights).

```html
<div data-skeleton class="aspect-(--aspect-product-card-vertical) rounded-(--product-card-image-radius)"></div>
<span data-skeleton class="h-(--product-card-title-line-height) w-4/5"></span>
<span data-skeleton class="h-(--product-card-price-line-height) w-14"></span>
<span data-skeleton class="size-(--product-card-swatch-size) rounded-full"></span>
```

#### Recommendations rail (CollectionBlock enhancement)

```css
.collection-block[data-horizontal="true"] {
  position: relative;
  display: flex;
  gap: var(--product-card-rail-gap);
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: var(--product-card-rail-pad);
  padding: 4px var(--product-card-rail-pad) 18px;
  scrollbar-width: none;
  /* edge-fade hint via mask — existing overflow-x-shadow utility achieves this */
  mask-image: linear-gradient(
    to right,
    transparent,
    black var(--product-card-rail-pad),
    black calc(100% - var(--product-card-rail-pad)),
    transparent
  );
}
.collection-block[data-horizontal="true"]::-webkit-scrollbar { display: none; }
.collection-block[data-horizontal="true"] > * {
  flex: 0 0 auto;
  scroll-snap-align: start;
  width: var(--product-card-max-width);
}

.collection-block-arrow {
  position: absolute;
  top: 38%;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: var(--product-card-bg);
  border: 1px solid var(--product-card-border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font: 600 16px/1 ui-sans-serif;
  cursor: pointer;
  box-shadow: var(--product-card-shadow-hover);
  z-index: 4;
  color: var(--product-card-title-color);
}
.collection-block-arrow[data-side="prev"] { left:  -8px; }
.collection-block-arrow[data-side="next"] { right: -8px; }
.collection-block-arrow[data-hidden] { display: none; }
@media (hover: none) {
  .collection-block-arrow { display: none; } /* touch users get native scroll */
}
```

### Color palette — defaults

| Token | Hex | Role |
|---|---|---|
| `--product-card-bg` | `#ffffff` | Card surface |
| `--product-card-border-color` | `#ece6d4` | Hairline border, dividers |
| `--product-card-title-color` | `#14110b` | Title, eyebrow on inverse, focused chip text |
| `--product-card-vendor-color` | `#8a8472` | Vendor eyebrow muted |
| `--product-card-image-bg` | `#faf7f0` | Image tile background (boxed) |
| `--product-card-image-bg-bare` | `#f3eedc` | Image tile background (frameless) |
| `--product-card-compare-color` | `#6b6555` | Compare-price muted |
| `--product-card-urgency-color` | `#b54a2a` | Stock urgency line |
| `--product-card-more-bg` | `#f3eedc` | +N chip + inline picker shell |
| `--product-card-cta-bg` | `#14110b` | Inline-button CTA solid bg |
| `--product-card-cta-color` | `#ffffff` | Inline-button CTA fg |
| `--product-card-fast-path-dot` | `#2f7d4a` | Single-buyable green dot |
| `--product-card-sale-current-color` | `#b54a2a` | On-sale current price (when set) |

### State coverage matrix

Every primitive × every state. Implementation must cover all cells; tests must verify.

| Primitive | default | hover | active | focus-visible | selected | unavailable | disabled |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Card chassis | ✓ | ✓ (shadow up) | — | ✓ (focus-within shadow up) | — | — | — |
| Image | ✓ | ✓ (swap when images[1]) | — | — | — | — | ✓ (OOS saturate 0.85) |
| Swatch | ✓ | ✓ (scale 1.08) | ✓ (scale 0.94) | ✓ | ✓ (ring) | ✓ (strike) | — |
| Chip | ✓ | ✓ (scale 1.04) | ✓ (scale 0.96) | ✓ | ✓ (filled) | ✓ (dim + strike) | — |
| +N chip | ✓ | ✓ (bg-darken + scale 1.03) | ✓ (scale 0.97) | ✓ | — | — | — |
| CTA float-pill | ✓ | ✓ (shadow grow) | ✓ (scale 0.96) | ✓ | — | — | ✓ (opacity 0.45) |
| CTA inline-button | ✓ | ✓ (bg-lighten) | ✓ (scale 0.99) | ✓ | — | — | ✓ (opacity 0.45) |
| Picker shells | open (anim in) | — | — | ✓ (focus trap inside) | — | — | — |
| Sale badge | ✓ × 4 styles | — | — | — | — | — | — |

## Performance & implementation guardrails

Applied from the Next.js / Vercel React / Tailwind layouts best-practice lenses:

- **Slim `ProductCardData` shape** at the client boundary (Vercel `server-serialization`). Saves bytes per card × N cards per page in the RSC payload.
- **Picker shells loaded via `next/dynamic` with `ssr: false`** (Vercel `bundle-dynamic-imports`). Defers Radix Dialog / Popover bundle weight until the user activates the CTA.
- **Two-context provider split** (Vercel `rerender-split-combined-hooks`). Toggling picker open/close doesn't re-render variant consumers; picking a variant doesn't re-render the picker's open state.
- **`content-visibility-auto`** preserved on `CollectionBlock`. Existing custom utility in `globals.css:70`. Cuts off-screen card paint cost in long grids.
- **`scroll-padding-inline` on rails** for the snap behavior (Tailwind advanced layouts pattern).
- **Tailwind 4 native syntax** for token-driven utilities — `bg-(--product-card-bg)`, `aspect-(--aspect-product-card-vertical)`, etc. Confirmed against `tailwindcss@4.3.0` in `apps/storefront/package.json`.
- **No barrel `index.tsx`** for primitives (Vercel `bundle-barrel-imports`). Single named re-export of `<ProductCard>` from the package; primitives imported directly from their paths.
- **`React.cache()` for `getDictionary`** if not already wrapped (Vercel `server-cache-react`). Verify and add during Phase 2.
- **`next/image` `sizes` token** `--product-card-image-sizes` calibrated for the new 200–240px bounds. Replaces hardcoded `(max-width: 768px) 50vw, 280px`.
- **`focus-visible` (not `focus`)** for keyboard-only rings. Browser-native, no polyfill needed in modern Next.js.
- **No dark-mode tokens shipped in this spec.** The site does not have dark-mode support yet. Defaults are light-mode values. Tokens are *shaped* so a future dark-mode initiative can override them cleanly via `@media (prefers-color-scheme: dark)` or `[data-theme="dark"]`, but the spec does not ship any auto-flipping behavior or dark palette. Sale-badge styles `default`/`inverse` inherit whatever the tenant's `--product-card-bg` / `--product-card-title-color` are at runtime; that flip is structural, not automatic.

## Bug fixes — root causes

| Bug | Root cause | Fix |
|---|---|---|
| Search renders 0 cards despite "3 PRODUCTS" | `SEARCH_PRODUCTS_QUERY` in `search.ts:15-77` omits `variants`. `SearchProductCard:26-28` returns null when missing. `unsafe_cast` masks the gap at type level. | Replace the inline fragment in `SEARCH_PRODUCTS_QUERY` with `PRODUCT_FRAGMENT_MINIMAL` (already used by collection-page). Same shape, includes `options.optionValues.swatch`, `selectedOrFirstAvailableVariant`, `variants(first:3)`. |
| `+0` overflow chip / wrong `+N` count | Two systems race: `More.tsx:15` computes `length - 4` at JSX render; `Group.tsx:18-34` runs `useEffect` reading `--inline-limit` from `getComputedStyle` and mutates the first matched `[data-option-more]` via querySelector — which collides across sibling groups. | Delete the `useEffect` in `Group.tsx`. `More.tsx` is the sole source of truth; computes overflow from `Math.max(0, group.values.length - 4)`; returns null when 0. CSS `:global([data-overflow="0"])` rule deleted along with the CSS module. |
| Cream banding inside image tile | `object-fit: contain` + non-4:5 source images shows wrapper bg through. | Default `object-fit: cover`. `--product-card-image-fit` token allows tenant opt-in to `contain`. |
| Carousel overflows viewport (PDP "You may also like") | `CollectionBlock` `isHorizontal={true}` has no scroll affordance. | Enhance `CollectionBlock`: render `CollectionBlockArrows` client child when `isHorizontal === true`. `IntersectionObserver` on first/last children drives visibility. |
| Size pills with text strikethrough | Sizes rendered on base card; unavailable as text-strikethrough. | Drop sizes from base card entirely. Sizes only inside the picker. Unavailable chips use pseudo-element strike line, not `text-decoration`. |
| OOS opacity too aggressive (0.5) | Chassis hard-codes `opacity-50`. | Token `--product-card-oos-opacity` (default `0.7`). Image saturate token added. |

## Implementation phases

### Phase 1 — Search bug fix + investigation finalization (smallest blast radius)

1. Swap inline product fragment in `apps/storefront/src/api/shopify/search.ts` for `PRODUCT_FRAGMENT_MINIMAL`.
2. Add E2E smoke `e2e/search-renders-cards.spec.ts`: load `/search?q=t-shirt`, assert `getAllByTestId('product-card-root').length === totalCount`.
3. Verify locally + commit. This phase ships independently from the redesign and unblocks production.

### Phase 2 — Foundation: tokens, registry, primitives provider

1. Add new tokens to `apps/storefront/src/app/globals.css`. Keep existing tokens (rename `--product-card-vendor-size` → `--product-card-eyebrow-size`, update vendor primitive to read the new name).
2. Create `product-card/cta/index.ts` and `product-card/picker/index.ts` registries with their respective `register…` / `get…` functions.
3. Create `product-card/primitives/product-card-options-provider.tsx` (client provider; replaces today's inline `ProductOptions.Root` wrapping inside the chassis).
4. Create `product-card/presets.ts` with `SURFACE_PRESETS` constant.

### Phase 3 — Primitives rewrite (server-first)

1. Rewrite `product-card-root.tsx`: drop `chrome="bare"` enum value (replace usages with `frameless`); drop `layout="micro"` (delete enum value and all CSS classes that referenced it); reads `layout`, `chrome`, `ctaPlacement`, `pickerPresentation` props.
2. **`product-card-image.tsx` is already a thin server wrapper that delegates to `VariantImageClient`** (`apps/storefront/src/components/product-display/primitives/variant-image-client.tsx`). The client implementation already reads `useMaybeProductOptions()` for variant-bound image swap. Changes needed: default `object-fit: contain` → `cover` (token-driven); replace hardcoded `sizes="(max-width: 768px) 50vw, 280px"` with `var(--product-card-image-sizes)` calibrated to the new 200–240px bounds; rename the wrapper to `ProductCardImage` and drop the `aspect="micro"` value.
3. Server-only primitives (Badges, Vendor, Title, Price, StockUrgency): unchanged signature, lighter implementations (no `'use client'`; no context reads).
4. New `product-card-swatches.tsx` (client): renders existing `ProductOptions.Swatch` primitives; click swaps image + pre-selects color.
5. New `product-card-cta.tsx` (client): reads `ctaPlacement` from provider, looks up component from registry, renders it. Handles single-buyable fast-path: calls `onAdd` directly if `isSingleBuyable`; else `onActivate` to open picker.
6. New `product-card-picker.tsx` (client): reads `pickerPresentation` from provider, resolves `auto` per the routing rule, looks up shape from registry, renders it. Internal contents compose `ProductOptions.Group`, `ProductOptions.Chip`, `ProductOptions.Swatch` from existing primitives.
7. CTA strategy files: `cta/float-pill.tsx`, `cta/inline-button.tsx`. Each implements `ProductCardCtaComponent` and registers itself at module init.
8. Picker shape files: `picker/float.tsx`, `picker/sheet.tsx`, `picker/inline.tsx`. Each implements `ProductCardPickerComponent` and registers itself at module init.
9. Per-primitive `.skeleton` statics for all primitives.
10. Composite `ProductCard.skeleton` in `product-card.tsx`.

### Phase 4 — CSS modules → Tailwind migration

1. Delete `apps/storefront/src/components/product-card/product-card.module.css`. Port the container-query block to Tailwind `@container/card` utilities — but per the sizing decision, the swatch inline-limit logic doesn't port (it's deleted entirely along with the variable inline-limit).
2. Delete `apps/storefront/src/components/product-options-selector/product-options-selector.module.css`. Port classes to Tailwind on `product-options-selector.tsx` and `renderers/*-renderer.tsx`. Visual port is 1:1 — no redesign.
3. Delete `apps/storefront/src/components/product-options-selector/renderers/chip.module.css`. Port to Tailwind on the renderer file.
4. Remove `:global(...)` selectors entirely. The `:global([data-overflow="0"] [data-option-more]) { display: none }` rule disappears because `More.tsx` short-circuits in JSX.
5. Delete the phantom `spec: 2026-05-26-product-card-fix-design.md §Tokens` comment in `globals.css`. Update with the new spec reference.

### Phase 5 — Surface wrappers + CollectionBlock arrows

1. Update `collection-product-card.tsx` to spread `SURFACE_PRESETS.collection`.
2. Update `recommendation-product-card.tsx` to spread `SURFACE_PRESETS.recommendation`.
3. Update `search-product-card.tsx`: change `chrome` to `boxed`, spread `SURFACE_PRESETS.search`, and stop importing the deleted `product-card-actions` / `product-card-options` primitives.
4. Update `search-content-gate.tsx`: `ProductCard.skeleton` calls use `layout="horizontal" chrome="boxed"` (was `bare`).
5. Delete `cart-drawer-product-card.tsx` (zero consumers).
6. Add `collection-block-arrows.tsx` (client component); enhance `collection-block.tsx` to render it when `isHorizontal === true`.

### Phase 6 — Tests + verification

1. Add unit tests per the Test strategy section.
2. Add E2E tests per the Test strategy section.
3. Update existing unit tests to match the new primitive shape.
4. Run `pnpm test --project @nordcom/commerce-storefront --coverage`. Branch coverage must remain ≥ 50% on `apps/storefront/src`.
5. Run `pnpm test:e2e`. All new E2E specs pass.
6. Manual verification per the "Manual verification" section.

## Testing strategy

### Unit (vitest)

**New files:**
- `product-card/cta/float-pill.test.tsx`, `product-card/cta/inline-button.test.tsx`
- `product-card/cta/registry.test.ts` — register-and-lookup contract
- `product-card/picker/float.test.tsx`, `product-card/picker/sheet.test.tsx`, `product-card/picker/inline.test.tsx`
- `product-card/picker/registry.test.ts`
- `product-card/presets.test.ts`
- `product-card/primitives/product-card-options-provider.test.tsx` — selection state, single-buyable detection, fast-path event firing
- `product-card/primitives/product-card-swatches.test.tsx` — image swap + pre-select
- `product-card/primitives/product-card-cta.test.tsx` — strategy lookup, fast-path vs picker-open dispatch
- `product-card/primitives/product-card-picker.test.tsx` — presentation routing (`auto` resolution)
- `products/collection-block-arrows.test.tsx` — IntersectionObserver-driven visibility, scrollBy on click

**Updated files:**
- `product-card.test.tsx`, `primitives/product-card-root.test.tsx` — new chrome enum, dropped micro layout, new tokens.
- `primitives/product-card-image.test.tsx` — variant-bound rendering, initial SSR matches seed.
- `primitives/product-card-badges.test.tsx` — corner positioning, sale-badge style enum.
- `primitives/product-card-title.test.tsx` — line-clamp height assertions.
- `primitives/product-card-price.test.tsx` — pseudo-strike rendering, compare-not-rendered when no discount.
- `primitives/product-card-stock-urgency.test.tsx` — threshold-driven render.
- `product-options/primitives/more.test.tsx` — pure JSX render; `if (overflow === 0) return null` short-circuit.
- `product-options/primitives/group.test.tsx` — `useEffect` deleted; no DOM mutation; `data-overflow` attribute static.

### E2E (Playwright)

- `e2e/search-renders-cards.spec.ts` — search results render correct number of cards (Phase 1 regression smoke).
- `e2e/picker-open-close.spec.ts` — float, sheet, inline all open / close cleanly (ESC, backdrop, outside-click).
- `e2e/swatch-image-swap.spec.ts` — swatch click swaps image; URL unchanged.
- `e2e/single-buyable-fast-path.spec.ts` — single-variant product `+` adds directly; cart line appears.
- `e2e/out-of-stock-disabled.spec.ts` — fully-OOS product → `+` disabled, opacity 0.7, badge "Sold out".
- `e2e/recommendations-rail-arrows.spec.ts` — PDP "You may also like" arrows show when overflowing; hidden when fits.
- `e2e/sale-state.spec.ts` — strike rendering, badge visibility threshold, savings line opt-in, current-color tinting.

**Updated:** `e2e/product-card.spec.ts` — match new card shape (no size pills on base card, swatches present, picker affordance, single-buyable green dot).

### Visual regression

**Deferred to a future spec.** Token-driven design with tenant overrides means pixel-stable snapshots are wrong by design until the tenant customization system ships with per-shop snapshot directories.

### Coverage threshold

Branch-coverage ≥ 50% on `apps/storefront/src` (existing project gate, enforced by vitest config).

## Manual verification

Before declaring done:

1. **Production reproduction site visited.** Open `https://beta.pouched.de/en-US/search/?q=t-shirt` — confirm cards now render (current bug).
2. **Open `https://beta.pouched.de/en-US/products/men-t-shirt/`** — confirm:
   - No `+0` chip leak.
   - No text-strikethrough on size pills (no pills at all on base card).
   - Recommendations rail arrows visible; rail doesn't clip past viewport.
   - Image has no cream banding.
3. **Local dev**: open `/collections/<any>/` — confirm grid uses 200–240px cards across viewport widths.
4. **Local dev mobile viewport** (Chrome DevTools 375px): tap `+` on a card → sheet opens at bottom, drag handle visible, ESC closes, focus returns to `+`.
5. **Keyboard nav**: tab through a card row — focus visible on title, swatches, CTA; card lifts shadow on focus-within. Tab to next card; no double rings.
6. **Reduced motion**: enable in OS → swatch/chip hover no scale; picker opens with opacity-only fade.
7. **One single-variant product**: confirm green dot on `+`; click adds directly; cart drawer shows item.
8. **On-sale product**: confirm angled strike on compare price; verify badge respects min-discount threshold (10% → no badge; 20% → badge).

## CONTEXT.md updates

The following terms get added under a new **Product card** section in `CONTEXT.md`:

- **Product card** — the chassis + primitives that render a single product as a browse tile. Composed via surface wrappers.
- **Surface wrapper** — per-surface composition of the product card (`Collection`, `Recommendation`, `Search`). Reads from `SURFACE_PRESETS`.
- **Picker** — the variant-selection UI that opens from a card's CTA. Presents as `float`, `sheet`, or `inline` per the routing rule.
- **Quick add** — informal term for the picker entry point. Token-driven CTA placement (`float-pill` | `inline-button`).
- **Single buyable variant fast-path** — when a product has exactly one variant and it's available, `+` adds directly without opening the picker.
- **CollectionBlock** (already exists; add note about the new arrow enhancement and its `isHorizontal` mode).

These updates land in the same commit as Phase 5 of the implementation.
