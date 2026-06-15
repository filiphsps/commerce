import type { ShopThemeTokens } from './theme';

/**
 * Declarative product-card variant selection for one card surface (e.g. `collection`, `search`,
 * `recommendation`). Plain, all-optional, open `string` fields — open `string` (rather than literal
 * unions) is intentional: an extension can register and select a *custom* named layout/chrome/picker/
 * CTA, so the manifest must reference names beyond the built-in set. The storefront completes the
 * resolution at the render boundary by feeding these names into `resolveProductCardSurface` and the
 * `getProductCardPicker` / `getProductCardCta` registries (which fall back gracefully on an unknown
 * name). Every field absent → the surface resolves to its current preset, unchanged.
 *
 * @example
 * ```ts
 * import type { ProductCardVariantSelection } from '@nordcom/commerce-db/lib/extensions';
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
 * The optional, declarative per-shop extension manifest — the single authored surface that unifies the
 * pre-existing per-shop composition points without forking any of them: `theme` token overrides,
 * `chrome.order` slot order, per-section `sections` visibility, `blocks.available` availability, and
 * per-surface `productCard` variant selections.
 *
 * Every field is optional and every sub-field defaults to the platform behavior, so an absent or empty
 * manifest composes — through `resolveExtensions` (in `@nordcom/commerce-cms/extensions`) —
 * byte-identically to today's resolved theme, chrome, sections, block availability, and card variants.
 * The manifest is the declarative *contract* only: it holds plain data, never component references or
 * code. It lives in the db package (the dependency sink) so it can sit on `ShopBase.extensions` and be
 * re-exported by the CMS-safe `@nordcom/commerce-cms/extensions` entrypoint without a dependency cycle.
 *
 * @example
 * ```ts
 * import type { ShopExtensionManifest } from '@nordcom/commerce-db/lib/extensions';
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
     * `shop.theme` resolves, i.e. today's render.
     */
    theme?: ShopThemeTokens;
    /** Chrome composition overrides. */
    chrome?: {
        /**
         * Ordered chrome slot ids passed verbatim to `resolveChromeLayout`. Nullish or empty → the
         * historical default order. Must be valid per `CHROME_SURFACE` or resolution throws.
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
         * The subset of block type ids a shop exposes. Absent → every block type is available (today's
         * behavior). Entries that are not a known block type are dropped gracefully rather than throwing.
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
