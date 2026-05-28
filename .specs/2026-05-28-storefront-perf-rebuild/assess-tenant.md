# Tenant-Customization & Extensibility — Current State vs. Goal

**Date:** 2026-05-28
**Goal stated:** "pretty much everything tenant customizable and in the future extensible."
**Scope:** What is tenant-configurable today, what is hardcoded that should be per-tenant, and the extensibility gap — plus the architectural foundation to close it.

---

## TL;DR verdict

The platform is genuinely multi-tenant at the **data + content-body** layer: hostname → shop → tenant routing is solid, and CMS pages/header/footer/business-data are per-tenant, localized, versioned. Branding is **two colors deep** (primary/secondary accents + logo). Everything else that defines how a storefront *looks and is composed* — the full design-token vocabulary, fonts, page chrome, template-page layout (PDP/PLP), block catalog, component variants — is **hardcoded globally and identical for every tenant**. There is **no slot/plugin registry for page structure** and **no third-party extension path**. Two small, closed, in-memory component registries (`product-card` picker/CTA) are the only existing "registry" pattern and are not tenant-aware.

---

## (a) What IS tenant-customizable today  `status: done`

Per-shop record (`packages/db/src/models/shop.ts` → `ShopBase`):
- **Branding accents** — `design.accents[]` (`type: primary|secondary`, `color`, `foreground`). Injected as CSS vars by `apps/storefront/src/utils/css-variables.tsx`. Falls back to Shopify Brand API when empty.
- **Logo + favicon** — `design.header.logo` (`src/alt/width/height`), `icons.favicon`.
- **i18n** — `i18n.defaultLocale`; available locales come from Shopify; fallback chain `request → shop default → 'en-US'` (`middleware/storefront.ts`).
- **Commerce** — `commerce.maxQuantity`, `commerce.processingTimeInDays`, `showProductVendor`.
- **Commerce provider** — Shopify/Stripe discriminated union with per-shop credentials (`commerceProvider`).
- **Integrations / third-party** — `integrations.judgeme`, `thirdParty.googleTagManager`, `thirdParty.intercom`.
- **Feature flags** — `featureFlags[]` references to `FeatureFlag` docs with MongoDB targeting rules.

CMS content (`packages/cms/src/collections/*`), tenant-scoped, localized, draft/autosave/versioned:
- **Pages** (`collections/pages.ts`) — block-based body; `(tenant, slug)` unique; homepage is a CMS page (`handle: 'homepage'`). Block types in `blocks/index.ts`: `alert, banner, collection, columns, html, media-grid, overview, rich-text, vendors`.
- **Header singleton** (`collections/_globals/header.ts`) — logo, top-level nav with **mega-menu variant picker** (`fields/nav-item.ts` → `HEADER_VARIANTS = editorial-columns | compact-list | featured-promo`), locale switcher, CTA.
- **Footer singleton** (`_globals/footer.ts`) — nav sections, social links, legal links, copyright.
- **Business data singleton** (`_globals/business-data.ts`) — legal name, contact, address, profiles.
- **SEO** — per-page `seoGroup()` (`fields/seo.ts`); `productMetadata`, `collectionMetadata` collections.
- **Articles, reviews** — tenant-scoped collections.

Feature flags evaluated per-shop via Vercel Flags adapter (`apps/storefront/src/utils/flags/adapter.ts`) against `flag.targeting` rules. Three flags exist (`definitions/`): `accounts-functionality`, `product-page-info-lines`, `search-filter`.

---

## (b) HARDCODED that should be per-tenant  `status: missing / opportunity`

1. **Background / foreground colors** — literally `#fefefe` / `#101418` in `css-variables.tsx:114-115` with `// TODO: Background and foreground colors.` Only the two accent pairs are dynamic; the rest of `--color-*` is static `:root` in `globals.css`.
2. **Typography / fonts** — `apps/storefront/src/utils/fonts.ts` hardcodes `Public_Sans`. `--font-primary` is global; no per-tenant font family/weights/scale.
3. **Product-card design tokens (~120 vars)** — `globals.css:181-304` hardcodes the entire product-card vocabulary: `--product-card-cta-placement: float-pill`, `--product-card-cta-pill-position`, `--product-card-quick-add-presentation`, `--product-card-sale-badge-style/position/text`, swatch sizes, radii, motion, etc. These are *exactly* the component-variant knobs the goal calls for ("the product-card picker shape") but they are global constants, not per-shop.
4. **Header / spacing / radius / shadow / motion tokens** — all hardcoded in `globals.css:122-321`.
5. **Page chrome composition** — `components/layout/shop-layout.tsx` hardcodes a fixed grid `info-bar → header → content → footer`. Order and section inclusion are not tenant-configurable.
6. **PDP template composition** — `app/[domain]/[locale]/products/[handle]/layout.tsx` arranges parallel routes (`@gallery`, `@description`, `@details`, `@recommendations`) in a fixed Tailwind layout. Not CMS-composable; tenants cannot reorder, toggle, or insert sections (beyond the single `product-page-info-lines` flag).
7. **PLP / search / cart / account** — hardcoded compositions in their `page.tsx`/`*-content.tsx`.
8. **Product-card surface variants** — `components/product-card/presets.ts` `SURFACE_PRESETS` fixes layout/chrome/cta/picker per *surface* (collection/recommendation/search), not per-tenant or CMS.
9. **Feature-flag catalog** — flags must be `defineFlag(...)`'d in storefront code (`utils/flags/definitions/*`). The DB controls the *value* of an existing flag per shop, but a tenant cannot introduce a new toggle/section switch without a code deploy.
10. **Block catalog** — `blocks/index.ts` `allBlocks` is a static array; no per-tenant enablement/whitelisting of block types.

---

## (c) The EXTENSIBILITY gap  `status: missing`

- **No slot/block/plugin registry for page structure.** Only the *body* of a CMS page is block-composable. Page chrome (`ShopLayout`) and template pages (PDP/PLP/cart/account) are fixed in code. A tenant cannot add a custom section to the homepage chrome or to a product page without a code deploy.
- **Block dispatch is a hardcoded `switch`.** `packages/cms/src/blocks/render/BlockRenderer.tsx:35-56` and the storefront's parallel `Blocks` dispatcher (`apps/storefront/src/blocks/`, per `components/cms/cms-content.tsx`) both switch on `blockType`. Adding a block = editing the CMS block list **and** ≥2 renderer switches. No single registry.
- **Component variant registries exist but are closed and not tenant-aware.** `components/product-card/picker/registry.ts` and `cta/registry.ts` are `Map`-based with `registerProductCardPicker` / `registerProductCardCta` exports — the closest thing to a plugin hook. But: populated only at module load with built-ins (`float/sheet/inline`, `float-pill/inline-button`); selection is by hardcoded surface preset, never by shop config or CMS; client-only `dynamic` imports; no external registration entrypoint.
- **No third-party extension mechanism.** No extension manifest, no per-shop code/asset loading, no sandbox. Everything ships in one Next.js deploy. The `register*` functions are never called from any extension surface.
- **Theme is two colors deep.** The shop record carries no theme token schema beyond `design.accents` + logo; the rich token set in `globals.css` is invisible to both the shop model and the CMS.

Note: the **Block loader** firewall (CONTEXT.md — storefront supplies Shopify data to CMS blocks at the render boundary; the CMS never knows what a product is) is a clean contract that a future third-party extension model should reuse and extend.

---

## Proposed architectural foundation

1. **Per-shop theme token system.** Lift the `globals.css` token vocabulary into a typed schema on the shop record (extend `design`, or a new `theme` group): colors (incl. background/foreground/surfaces), typography (font family/weights/scale), radii, spacing, and the product-card variant knobs. Serialize that map to CSS variables in `css-variables.tsx` (delete the hardcoded `#fefefe/#101418` and the `globals.css` `:root` constants that become tenant-owned). The token *names* already exist — this is mostly schema + serialization, not new design work.

2. **CMS-driven page composition (block/slot registry).** Promote page chrome and template pages to a slot model: a `layout`/`template` CMS surface per route-type (home, PDP, PLP) holding an ordered, toggleable list of sections. Replace the two hardcoded block `switch`es with **one shared registry** (`type → component`), consumed by both the CMS block definitions and the storefront renderer, so adding a section is a single registration. `ShopLayout` and `products/[handle]/layout.tsx` become registry-driven slot hosts.

3. **Per-shop feature flags / section enablement as data.** Make the flag catalog data-driven so tenants can toggle sections without a `defineFlag` code change — either generic section-enablement flags resolved from the `feature-flags` collection, or driving slot inclusion (foundation #2) directly from CMS rather than code-defined flags.

4. **Tenant-aware component-variant registry.** Generalize the product-card picker/CTA `Map` registries into a shared variant registry, and drive selection from shop config/CMS overrides instead of the hardcoded `SURFACE_PRESETS`. Keep `register*` as the public extension entrypoint.

5. **Forward path to third-party extensions.** A manifest-based extension registry: an extension declares blocks/sections, component variants, theme tokens, and (sandboxed) block loaders, registered per shop. Reuse the existing **Block loader** contract (host supplies provider data at the render boundary) so extensions never touch tenant credentials directly. This is the long-tail goal; foundations #1–#4 are its prerequisites.

### Concrete file anchors
- Shop model / token schema target: `packages/db/src/models/shop.ts` (`ShopBase.design`)
- Theme serialization: `apps/storefront/src/utils/css-variables.tsx`, `apps/storefront/src/app/globals.css`, `apps/storefront/src/utils/fonts.ts`
- Block registry unification: `packages/cms/src/blocks/index.ts`, `packages/cms/src/blocks/render/BlockRenderer.tsx`, `apps/storefront/src/blocks/`, `apps/storefront/src/components/cms/cms-content.tsx`
- Slot hosts: `apps/storefront/src/components/layout/shop-layout.tsx`, `apps/storefront/src/app/[domain]/[locale]/products/[handle]/layout.tsx`
- Variant registry pattern: `apps/storefront/src/components/product-card/picker/registry.ts`, `.../cta/registry.ts`, `.../presets.ts`
- Flags: `apps/storefront/src/utils/flags/` (`adapter.ts`, `definitions/`), `packages/cms/src/collections/feature-flags.ts`, `packages/db/src/models/feature-flag.ts`
