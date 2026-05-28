# Storefront Design & UX Assessment — the gap to "frankly impressive"

Date: 2026-05-28
Scope: `apps/storefront/src` — component library, design-token system (`app/globals.css` + Tailwind v4 `@theme` + Biome), and key page layouts (home, collection, product, cart).

## Verdict

The storefront is **functional, structurally sound, and partially modern**. The newest surfaces — the
product-card system (`components/product-card/**`) and product-options primitives
(`components/product-options/**`) — are genuinely polished: tokenized motion, `motion-safe` guards,
hover image-swap, fast-path add-to-bag dot, chip stamp animations, well-shaped focus rings. That bar
proves the team can ship "impressive."

Everything **around** those islands has not caught up. The page chrome is built from stacked generic
gray cards (`bg-gray-100`, `border-gray-200`), only the brand *accent* is tenant-themeable while the
entire neutral/semantic palette is hardcoded Tailwind defaults, the empty/error/404 states are bare
unstyled text, the homepage has no loading skeleton, and the design tokens carry two parallel naming
systems plus ~30 `LEGACY` entries. The result reads "competent SaaS template," not "premium
storefront." The highest-leverage work is **promoting the rest of the UI to the standard the product
card already sets, behind tenant-themeable tokens.**

---

## 1. Design token system

**Foundation (good):**
- Tailwind v4, no `tailwind.config.js`; tokens declared via `@theme inline` in `app/globals.css`.
- Rich primitive scales: `--block-border-radius*`, `--block-padding*`, `--block-spacer*`, header tokens,
  product-card tokens (~120 vars), motion tokens (`--*-motion-*`, easings `cubic-bezier(...)`).
- Tenant theming: `utils/css-variables.tsx` `CssVariablesProvider` injects
  `--color-accent-primary/secondary` (+ light/dark/text) from the shop's branding, derived with
  `colord` lighten/darken/saturate. This is the right mechanism.

**Gaps:**
- **Only the accent is themeable.** Surfaces, borders, body text, muted text, success/danger/sale,
  focus ring are all hardcoded Tailwind utilities (`bg-gray-100`, `text-gray-500`, `border-gray-200`,
  `text-red-500`, `bg-green-600`, `text-amber-600`, `bg-white`). 31 component files, ~130 occurrences;
  `bg-gray-100` alone appears 25 times and is the de-facto surface color. A tenant with a warm, dark, or
  high-contrast brand gets generic gray chrome regardless of their palette.
- `--color-background: #fefefe` and `--color-foreground: #101418` are **hardcoded** in
  `CssVariablesProvider` with `// TODO: Background and foreground colors.` — not tenant-derived.
- **No semantic surface/text scale** (`--surface-1/2/3`, `--text`, `--text-muted`, `--border-subtle`,
  `--border-strong`, `--state-success/danger/sale`, `--focus-ring`). No dark-mode token set.
- **Two parallel token namespaces:** plain `--accent-primary` vs theme `--color-accent-primary`, kept in
  sync by hand with `/* TODO: Remove these legacy variables */` markers.
- **~30 `LEGACY` product-card tokens** (px type sizes, swatch sizes, overlay, micro layout) still
  shipping, annotated for Phase 3 removal that hasn't landed.

---

## 2. Typography

- Single tenant font (`--font-primary` + system fallback). No display/heading-font slot per tenant — a
  premium brand cannot pair a display serif with a sans body.
- **No semantic type scale.** Sizes are ad-hoc Tailwind utilities scattered across components
  (`text-4xl/3xl/2xl/xl/lg/sm/xs`). Page `Title` is `text-3xl md:text-4xl`; product H1 is `text-3xl`;
  product-card title still reads LEGACY `--product-card-title-size: 14px`. No tokens like `--text-display`,
  `--text-h1`, and no fluid `clamp()` typography.
- `@tailwindcss/typography` is loaded for prose, but prose color/links aren't tied to tenant tokens.

---

## 3. Spacing rhythm

- Good token primitives exist (`--block-spacer*`, `--block-padding*`).
- But components mostly use raw `gap-3`, `gap-4`, `p-3`, `pt-1`, `mb-4` rather than the tokens, so spacing
  rhythm is not actually centralized/themeable. Newer cart-summary uses `var(--block-*)` correctly — the
  pattern exists but isn't enforced.

---

## 4. Visual polish & consistency

- `Card` (`components/layout/card.tsx`): `boxed` = `rounded-lg border border-gray-200 bg-gray-100`.
  Every page is a stack of these gray boxes — the dominant visual texture is "gray on gray," flat and
  generic. No elevation system, no surface hierarchy beyond the product card's own shadow tokens.
- `Button` (`components/actionable/button.tsx`): **one** primary variant. No secondary/outline/ghost/
  destructive/size variants in the system; consumers either `styled={false}` and hand-roll (banner CTA
  rolls its own `rounded-full bg-white`, cart "clear" / "remove" hand-style red text) or reuse primary.
  Inconsistent button language across the app.
- **Bug:** Button base class is `transition-color` (invalid utility; should be `transition-colors`) —
  line 38. The styled variant re-adds `transition-all` so it's partially masked, but the unstyled path
  transitions nothing.

---

## 5. Micro-interactions / animation

- **Strong where new:** product card (`primitives/variant-image-client.tsx` hover scale 1.04 + opacity
  swap; `cta/float-pill.tsx` `active:scale-96`, fast-path dot), option chip (`primitives/chip.tsx`
  `active:scale-[0.97]`, chip-stamp), header mega-menu staggered `animate-mega-menu-*`. Motion tokens and
  easings are well-defined.
- **Weak everywhere else:** cart line, buttons, breadcrumbs, pagination only `transition-colors`. No
  add-to-cart success animation/flourish, no cart-count bump, no quantity-stepper feedback beyond color.
- No **image blur-up / LQIP**: no `placeholder="blur"` on any `next/image`; images pop in. The PDP gallery
  crossfades via a manual `setTimeout(250ms)` + opacity, and staggers thumbnails up to `(i+1)*250ms`,
  which feels sluggish.

---

## 6. Accessibility

- **Biome a11y lint is disabled** (`biome.json`: `"a11y": { "recommended": false }`) — no automated gate;
  regressions ship freely.
- **Broken focus styles (typos):** `focus-visible::bg-gray-100` (double colon) on the header logo link
  (`header.tsx:60`) and `focus-visible::border-gray-300` (`quantity-selector.tsx:176`) — invalid
  selectors, so those focus indicators silently do nothing.
- `sr-only` appears in **only 1** component file across the whole library. Icon-only controls (header
  search, share buttons) lean on `title` attributes rather than `aria-label`/visually-hidden text.
- Focus-ring treatment is inconsistent: newer primitives use `outline:2px solid var(--accent)`, Button
  uses `focus-within:brightness-75`, others nothing. No single `--focus-ring` token/utility.
- Contrast risk: heavy use of `text-gray-500`/`gray-600` on `bg-gray-100`, and
  `--product-card-vendor-color #6b6555` on white (~4.0:1) is borderline for small text.
- `prefers-reduced-motion` is honored in ~9 newer files; the global skeleton **shimmer runs regardless**
  of reduced-motion (only mega-menu animations are gated in `globals.css`).
- Positives: Modal uses Radix Dialog (focus trap, Esc, visually-hidden description); cart line exposes an
  `aria-live` quantity.

---

## 7. Loading / skeleton states

- Good coverage in places: `[data-skeleton]` shimmer utility, `ProductCard.skeleton`,
  `CollectionBlock.skeleton`, `BreadcrumbsSkeleton`, `BannerBlock.Skeleton` (deliberately mirrors hero
  shape for CLS), header/footer skeletons.
- **Homepage `app/[domain]/[locale]/loading.tsx` renders an empty `PageContent`** — a blank screen on
  navigation to home. No skeleton.
- Skeleton aesthetic is hardcoded and off-brand: `background-color: rgba(0,0,0,0.2)`, black-alpha shimmer,
  `animation: shimmer 5s` (slow). Not tenant-themeable, looks heavy/gray.

---

## 8. Empty states

- **Cart empty state is a bare label:** `cart-lines.tsx` returns
  `<Label>There are no items in your cart.</Label>` — hardcoded English (not i18n), no illustration/icon,
  no "continue shopping" CTA, no recommended products. This is the primary conversion funnel.
- Collection with zero products renders nothing in the grid area — no friendly empty state.

---

## 9. Error states

- `error.tsx` and `not-found.tsx`: plain heading + paragraph text. Functional but unstyled and **hardcoded
  English** (not i18n). 404 has no "back home", no search box, no suggested products/collections. Both are
  missed brand moments.

---

## 10. Responsive behavior & imagery

- Mobile-first tokens with `@media (min-width: 48em)` overrides — solid foundation; header/layout adapt.
- **Header search is icon-only** linking to `/search/`; no inline/expandable search field even on desktop.
- **PDP gallery** (`product-gallery.tsx`): no pinch-zoom, lightbox, or fullscreen; primary image is
  `object-contain` inside heavy padding (`p-8 py-12 md:p-16`) so product imagery renders small. Manual
  load-token crossfade is clever but the imagery treatment undersells products.
- Image `object-fit` is inconsistent: cards `object-cover`, PDP `object-contain`, cart `object-contain`.

---

## Highest-impact, prioritized roadmap (all must stay token-driven / tenant-themeable)

1. **Semantic themeable token layer (foundation).** Add surface/text/border/state/focus tokens, derive
   background+foreground per tenant (kill the `#fefefe`/`#101418` TODO), migrate the ~130 hardcoded
   `gray/red/green/amber/white` utilities to them. Unlocks real tenant theming of the whole UI, not just
   the accent. *Impact: critical. Effort: large.*
2. **Cart empty state + 404 + error redesign.** Icon/illustration (token-tintable), i18n copy, and CTAs
   (continue shopping, featured collection, search). Directly affects conversion and brand perception.
   *Impact: high. Effort: medium.*
3. **Homepage loading skeleton.** Replace the blank `loading.tsx` with a hero+rail skeleton.
   *Impact: medium-high. Effort: small.*
4. **Button system variants** (primary/secondary/outline/ghost/destructive + sizes) as one tokenized
   component; fix `transition-color` typo; retire hand-rolled buttons. *Impact: high. Effort: medium.*
5. **Unified focus ring + global reduced-motion + re-enable Biome a11y.** Single `--focus-ring` utility;
   gate skeleton shimmer and all animations under `motion-safe`; fix the two `focus-visible::` typos.
   *Impact: high (a11y + consistency). Effort: small-medium.*
6. **Typography scale tokens** (+ optional fluid `clamp()`, tenant heading-font slot). *Impact: medium.
   Effort: medium.*
7. **Imagery upgrade:** LQIP/blur-up placeholders, consistent aspect ratios, PDP zoom/lightbox, larger
   product imagery. *Impact: medium-high. Effort: medium.*
8. **Token cleanup:** collapse `--accent-primary` vs `--color-accent-primary` duplication; complete the
   product-card `LEGACY` token removal. *Impact: medium (maintainability/consistency). Effort: medium.*
