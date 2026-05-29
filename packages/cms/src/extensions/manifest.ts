import type { ShopThemeTokens } from '@nordcom/commerce-db/lib/theme';

/**
 * Declarative product-card variant selection for one card surface (e.g. `collection`, `search`,
 * `recommendation`). The CMS-safe mirror of the storefront's server-only `ProductCardSurfaceOverride`:
 * the Block-loader firewall forbids importing that `server-only` type into a CMS-safe module, so the
 * shape is restated here as plain, all-optional, open `string` fields. Open `string` (rather than the
 * storefront's literal unions) is intentional and correct — the whole point of the variant registries
 * is that an extension can register and select a *custom* named layout/chrome/picker/CTA, so the
 * manifest must be able to reference names beyond the built-in set. The storefront completes the
 * resolution at the render boundary by feeding these names into `resolveProductCardSurface` and the
 * `getProductCardPicker` / `getProductCardCta` registries (which already fall back gracefully on an
 * unknown name). Every field absent → the surface resolves to its current preset, unchanged.
 *
 * @example
 * ```ts
 * import type { ProductCardVariantSelection } from '@nordcom/commerce-cms/extensions';
 * const search: ProductCardVariantSelection = { layout: 'horizontal', ctaPlacement: 'inline-button' };
 * ```
 */
export type ProductCardVariantSelection = {
    /** Selected card layout variant name (built-in `vertical` / `horizontal`, or a registered name). */
    layout?: string;
    /** Selected card chrome variant name (built-in `boxed` / `frameless`, or a registered name). */
    chrome?: string;
    /** Selected CTA variant name resolved against the storefront CTA registry (defaults to `float-pill`). */
    ctaPlacement?: string;
    /** Selected picker variant name resolved against the storefront picker registry (defaults to `float`). */
    pickerPresentation?: string;
};

/**
 * The optional, declarative per-shop extension manifest — the single authored surface that UNIFIES the
 * five pre-existing per-shop composition points without forking any of them:
 *
 * 1. `theme` — token overrides resolved by `resolveTheme` against `THEME_DEFAULTS` (P3-1).
 * 2. `chrome.order` — chrome slot order resolved by `resolveChromeLayout` against `CHROME_SURFACE` (P4-2).
 * 3. `sections` — per-section visibility, composed with the render-boundary flag predicate (P3-6).
 * 4. `blocks.available` — the subset of `BLOCK_TYPES` a shop exposes, gated via `isBlockType` (P4-1).
 * 5. `productCard` — per-surface variant selections fed to the storefront registries (P4-3).
 *
 * Every field is optional and every sub-field defaults to the platform behavior, so an absent or empty
 * manifest composes — through {@link import('./resolve').resolveExtensions} — byte-identically to
 * today's resolved theme, chrome, sections, block availability, and card variants. The manifest is the
 * declarative *contract* only: it holds plain data, never component references or code. It is kept
 * CMS-safe on purpose — this module imports only the db theme leaf type, never React, Shopify, the
 * storefront, or any tenant credential — so the Block-loader firewall stays intact. Live registration
 * of components, and the deferred third-party code sandbox, live on the storefront side (see the
 * `register*` entrypoints and the deferred-sandbox note in {@link import('./resolve').resolveExtensions}).
 *
 * @example
 * ```ts
 * import type { ShopExtensionManifest } from '@nordcom/commerce-cms/extensions';
 * const manifest: ShopExtensionManifest = {
 *     theme: { colors: { background: '#0b0b0b' } },
 *     chrome: { order: ['header', 'content', 'footer'] },
 *     sections: { 'info-bar': false },
 *     blocks: { available: ['banner', 'rich-text'] },
 *     productCard: { search: { layout: 'horizontal' } },
 * };
 * ```
 */
export interface ShopExtensionManifest {
    /**
     * Theme token overrides. A {@link ShopThemeTokens} deep-partial resolved by `resolveTheme` against
     * `THEME_DEFAULTS`; when present it supersedes the stored `shop.theme`. Absent → the stored
     * `shop.theme` (itself absent on every existing shop) resolves, i.e. today's render.
     */
    theme?: ShopThemeTokens;
    /** Chrome composition overrides. */
    chrome?: {
        /**
         * Ordered chrome slot ids passed verbatim to `resolveChromeLayout`. Nullish or empty → the
         * historical default order. Must be valid per `CHROME_SURFACE` (known, unique, includes the
         * required `content` slot) or resolution throws.
         */
        order?: readonly string[] | null;
    };
    /**
     * Per-section visibility overrides keyed by bare section id (e.g. `'info-bar'`, `'hero'`). An
     * explicit `false` hides the section and an explicit `true` forces it visible, each taking
     * precedence over the render-boundary flag predicate. A section absent from this map defers to that
     * predicate (which itself defaults to visible), so an empty map preserves today's behavior.
     */
    sections?: Record<string, boolean>;
    /** Block availability overrides. */
    blocks?: {
        /**
         * The subset of block type ids a shop exposes. Absent → every `BLOCK_TYPES` member is available
         * (today's behavior). Entries that are not a known block type are dropped gracefully (matching
         * `isBlockType`'s forward-compatible degradation) rather than throwing.
         */
        available?: readonly string[];
    };
    /**
     * Per-surface product-card variant selections keyed by surface name (e.g. `collection`, `search`,
     * `recommendation`). Each value layers onto the surface preset at the storefront render boundary.
     * Absent → every surface resolves to its current preset.
     */
    productCard?: Record<string, ProductCardVariantSelection>;
}
