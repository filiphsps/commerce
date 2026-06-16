import { TypeError } from '@nordcom/commerce-errors';
import { colord } from 'colord';

import { cartLineCustomProperty, isQuotedProductCardKey, productCardCustomProperty } from './theme-catalog';

/**
 * Allowlist of selectable font families, keyed by a stable slug with a human-readable label. This is
 * the single source of truth shared by the CMS `typography.fontFamily` / `typography.headingFamily`
 * selects and the storefront `next/font` loader: `next/font` forbids dynamically-named fonts, so the
 * storefront must declare one module-scope loader per key here, and the CMS only ever offers these
 * keys. {@link resolveTheme} narrows any unrecognized authored value back to the platform-default
 * font key, so a stale or hand-edited record can never reference a family the storefront cannot
 * statically load. The default key is `public-sans` (see {@link THEME_DEFAULTS}.typography), matching
 * the single family the storefront loads today.
 *
 * @example
 * ```ts
 * import { FONT_FAMILIES } from '@nordcom/commerce-db';
 * const options = Object.entries(FONT_FAMILIES).map(([value, label]) => ({ value, label }));
 * ```
 */
export const FONT_FAMILIES = {
    'public-sans': 'Public Sans',
    inter: 'Inter',
    roboto: 'Roboto',
    'open-sans': 'Open Sans',
    lato: 'Lato',
    montserrat: 'Montserrat',
    poppins: 'Poppins',
    nunito: 'Nunito',
    'work-sans': 'Work Sans',
    'source-serif-4': 'Source Serif 4',
    lora: 'Lora',
    'playfair-display': 'Playfair Display',
    merriweather: 'Merriweather',
} as const;

/**
 * Union of valid {@link FONT_FAMILIES} keys. A resolved theme's `typography.fontFamily` /
 * `headingFamily` is always one of these after {@link resolveTheme} narrows unrecognized values, so
 * the storefront loader can index its `next/font` map by this type without a runtime guard.
 */
export type FontFamilyKey = keyof typeof FONT_FAMILIES;

/**
 * A single brand accent swatch. Shared between the required `ShopBase.design.accents` source and the
 * optional `theme.colors.accents` override so both surfaces stay structurally identical.
 *
 * @example
 * ```ts
 * import type { AccentToken } from '@nordcom/commerce-db';
 * const primary: AccentToken = { type: 'primary', color: '#073b4c', foreground: '#ffffff' };
 * ```
 */
export type AccentToken = {
    type: 'primary' | 'secondary';
    color: string;
    foreground: string;
};

/**
 * Flat per-knob token map for the product card. Keys are the camelCase mirror of the
 * `--product-card-*` CSS custom properties in `apps/storefront/src/app/globals.css` (`html:root`):
 * a key maps to `--product-card-${kebab(key)}` with two exceptions — the aspect-ratio knobs
 * (`aspectVertical`, `aspectHorizontal`, `aspectHorizontalSquare`, `aspectMicro`) map to the
 * `--aspect-product-card-*` namespace instead. Numeric and boolean knobs are typed as such because
 * the CSS values are unitless (`titleLineClamp: 2`, `oosOpacity: 0.7`, `saleBadgeAllowOverlap: false`)
 * — typing them all as `string` would mis-serialize them. Quoted knobs (`imageSizes`, `ctaPillLabel`,
 * `ctaPillIcon`, `saleBadgeText`) hold the logical content; the storefront serializer wraps them in
 * CSS quotes on emit. Knobs annotated LEGACY back pre-Phase-3 primitives and are slated for removal
 * with their CSS vars in Phase 3 of `.specs/2026-05-26-product-card-redesign/`.
 *
 * @example
 * ```ts
 * import type { ResolvedProductCardTokens } from '@nordcom/commerce-db';
 * function ctaBackground(t: ResolvedProductCardTokens): string {
 *     return t.ctaBg;
 * }
 * ```
 */
export interface ResolvedProductCardTokens {
    // Chassis
    bg: string;
    borderColor: string;
    borderWidth: string;
    /** LEGACY → `--product-card-radius`. */
    radius: string;
    /** LEGACY → `--product-card-padding`. */
    padding: string;
    /** LEGACY → `--product-card-gap`. */
    gap: string;
    shadow: string;
    shadowHover: string;
    minWidth: string;
    maxWidth: string;
    gridAlign: string;
    /** → `--product-card-rail-edge-style`. Carousel edge cue: `fade` (scroll-driven gradient mask) or
     * `none`. Read by a CSS style query on the rail, so a tenant flips the affordance theme-wide. */
    railEdgeStyle: string;
    searchImageWidth: string;

    // Image
    /** LEGACY → `--product-card-image-radius`. */
    imageRadius: string;
    /** LEGACY → `--product-card-image-padding`. */
    imagePadding: string;
    imageFit: string;
    imageHoverSwap: string;
    /** Quoted on emit → `--product-card-image-sizes`. */
    imageSizes: string;
    /** → `--aspect-product-card-vertical`. */
    aspectVertical: string;
    /** → `--aspect-product-card-horizontal`. */
    aspectHorizontal: string;
    /** LEGACY → `--aspect-product-card-horizontal-square`. */
    aspectHorizontalSquare: string;
    /** LEGACY → `--aspect-product-card-micro`. */
    aspectMicro: string;

    // Typography
    vendorColor: string;
    /** LEGACY → `--product-card-vendor-size`. */
    vendorSize: string;
    titleColor: string;
    /** LEGACY → `--product-card-title-size`. */
    titleSize: string;
    /** LEGACY → `--product-card-title-weight`. */
    titleWeight: number;
    titleLineClamp: number;
    priceColor: string;
    /** LEGACY → `--product-card-price-size`. */
    priceSize: string;
    /** LEGACY → `--product-card-price-weight`. */
    priceWeight: number;
    compareColor: string;
    urgencyColor: string;
    urgencyThreshold: number;
    eyebrowTracking: string;

    // Swatch
    swatchSize: string;
    swatchGap: string;
    swatchRingColor: string;
    swatchHitPadding: string;

    // Chip + More
    chipBg: string;
    chipColor: string;
    chipBorder: string;
    chipActiveBg: string;
    chipActiveColor: string;
    /** LEGACY → `--product-card-chip-padding-y`. */
    chipPaddingY: string;
    /** LEGACY → `--product-card-chip-padding-x`. */
    chipPaddingX: string;
    moreBg: string;
    moreColor: string;
    /** LEGACY → `--product-card-more-size`. */
    moreSize: string;
    /** LEGACY → `--product-card-more-weight`. */
    moreWeight: number;
    /** LEGACY → `--product-card-more-min-size`. */
    moreMinSize: string;

    // CTA / quick-add
    ctaBg: string;
    ctaColor: string;
    /** LEGACY → `--product-card-cta-radius`. */
    ctaRadius: string;
    /** LEGACY → `--product-card-cta-padding-y`. */
    ctaPaddingY: string;
    ctaHeight: string;
    ctaPlacement: string;
    ctaPillPosition: string;
    /** Quoted on emit → `--product-card-cta-pill-label`. */
    ctaPillLabel: string;
    /** Quoted on emit → `--product-card-cta-pill-icon`. */
    ctaPillIcon: string;
    ctaPillReveal: string;
    ctaInlineStyle: string;
    fastPathDot: string;
    fastPathSingleVariant: string;
    quickAddPresentation: string;

    // Overlay (LEGACY — overlay primitive deleted in Phase 3)
    /** LEGACY → `--product-card-overlay-bg`. */
    overlayBg: string;
    /** LEGACY → `--product-card-overlay-radius`. */
    overlayRadius: string;
    /** LEGACY → `--product-card-overlay-border-color`. */
    overlayBorderColor: string;
    /** LEGACY → `--product-card-overlay-shadow`. */
    overlayShadow: string;
    /** LEGACY → `--product-card-overlay-width`. */
    overlayWidth: string;
    /** LEGACY → `--product-card-overlay-max-height`. */
    overlayMaxHeight: string;
    /** LEGACY → `--product-card-overlay-padding`. */
    overlayPadding: string;

    // Out-of-stock
    oosOpacity: number;
    oosImageSaturate: number;

    // Motion
    motionEase: string;
    motionFast: string;
    motionBase: string;
    motionPickerIn: string;
    motionPickerOut: string;
    /** LEGACY → `--product-card-motion-hover-duration`. */
    motionHoverDuration: string;
    /** LEGACY → `--product-card-motion-hover-ease`. */
    motionHoverEase: string;
    /** LEGACY → `--product-card-motion-image-swap-duration`. */
    motionImageSwapDuration: string;
    /** LEGACY → `--product-card-motion-overlay-in-duration`. */
    motionOverlayInDuration: string;
    /** LEGACY → `--product-card-motion-overlay-in-ease`. */
    motionOverlayInEase: string;

    // Sale / badge
    saleStyle: string;
    saleStrikeColor: string;
    saleStrikeAngle: string;
    saleStrikeExtend: string;
    saleCurrentColor: string;
    saleShowSavingsLine: string;
    saleBadgeStyle: string;
    saleBadgePosition: string;
    /** Quoted on emit → `--product-card-sale-badge-text`. */
    saleBadgeText: string;
    saleBadgeMinDiscount: number;
    saleBadgeAllowOverlap: boolean;
}

/**
 * Tenant-tunable cart-line knobs. Mirrors the product-card token pattern (a flat map serialized
 * diff-from-default onto `--cart-line-*` custom properties) so the cart line is themeable from the
 * same admin theme editor. Variant chips/swatches reuse the product-card option tokens, so the cart
 * and the card stay one visual system; these knobs cover the cart-line chassis only.
 */
export interface ResolvedCartLineTokens {
    /** → `--cart-line-image-size`. */
    imageSize: string;
    /** → `--cart-line-image-radius`. */
    imageRadius: string;
    /** → `--cart-line-gap` (image-to-content gap). */
    gap: string;
    /** → `--cart-line-padding-y` (vertical density). */
    paddingY: string;
    /** → `--cart-line-divider-color`. */
    dividerColor: string;
    /** → `--cart-line-variant-style`. Base presentation for non-color variant values: `swatch`
     * (color dot only) | `chip` | `text`. Color options always render a swatch (augmenting this). */
    variantStyle: string;
    /** → `--cart-line-show-vendor`. When `false`, hides the vendor name on the cart line. */
    showVendor: boolean;
    /** → `--cart-line-show-sku`. When `true`, shows the variant SKU on the cart line. */
    showSku: boolean;
}

/**
 * Fully-populated, platform-defaulted theme token map for a single shop. Every field carries a
 * concrete platform default (sourced from `apps/storefront/src/app/globals.css`) so the storefront
 * serializer (P3-2) never has to know a default — it reads a resolved value for every token. The
 * serializer emits each token onto the CSS custom property components consume today (so a tenant
 * edit takes effect immediately): `colors.background → --color-background`,
 * `colors.surface.base → --color-block` (the semantic `--surface-1` aliases it),
 * `radii.block → --block-border-radius`, `productCard.ctaBg → --product-card-cta-bg`, etc.
 *
 * The four accent light/dark shades (`accentPrimaryLight`, …) are intentionally OPTIONAL and absent
 * by default: the storefront derives them from the base accent via `colord` at request time, so a
 * value here is an explicit override of that derivation rather than a default.
 *
 * @example
 * ```ts
 * import type { ResolvedShopTheme } from '@nordcom/commerce-db';
 * function pageBackground(theme: ResolvedShopTheme): string {
 *     return theme.colors.background;
 * }
 * ```
 */
export interface ResolvedShopTheme {
    colors: {
        /** → `--color-background` (replaces the hardcoded `#fefefe`). */
        background: string;
        /** → `--color-foreground` (replaces the hardcoded `#101418`). */
        foreground: string;
        /** Brand accents — `theme.colors.accents` supersedes `design.accents`; `--color-accent-*`. */
        accents: AccentToken[];
        /** Override of the runtime `colord` derivation → `--color-accent-primary-light`. */
        accentPrimaryLight?: string;
        /** Override of the runtime `colord` derivation → `--color-accent-primary-dark`. */
        accentPrimaryDark?: string;
        /** Override of the runtime `colord` derivation → `--color-accent-secondary-light`. */
        accentSecondaryLight?: string;
        /** Override of the runtime `colord` derivation → `--color-accent-secondary-dark`. */
        accentSecondaryDark?: string;
        /** Surface ramp → `--color-block` / `--color-block-light` / `--color-block-dark` (the
         * semantic `--surface-1` / `--surface-2` / `--surface-3` alias these). */
        surface: { base: string; raised: string; sunken: string };
        /** Body text ramp → `--color-dark` / `--color-dark-secondary` (the semantic `--text` /
         * `--text-muted` alias these). */
        text: { default: string; muted: string };
        /** Border ramp → `--border-default` / `--border-strong`. No consumer until the P5 semantic
         * migration, so a tenant override is inert today. */
        border: { default: string; strong: string };
        /** State ramp → `--color-sale` / `--color-danger` / `--color-block-success` /
         * `--color-block-info` (the semantic `--state-*` alias these). */
        state: { sale: string; danger: string; success: string; info: string };
        /** → `--focus-ring`. Defaults to `var(--accent)`. No consumer until the P5 semantic
         * migration (components read `var(--accent)` directly today), so an override is inert. */
        focusRing: string;
        /** → `--section-dark-bg`. Fill painted behind a section whose CMS `colorScheme` is `dark`
         * (the Collection / Banner dark option); `.on-dark` flips the ink that sits on it. */
        sectionDark: string;
    };
    typography: {
        /** Allowlist key resolved to a module-scope `next/font` call in the storefront → `--font-primary`. */
        fontFamily: string;
        /** Display/heading allowlist key → `--font-heading`; defaults to the body family. */
        headingFamily: string;
        /** Font-weight ramp → `--font-weight-normal` / `-medium` / `-semibold` / `-bold` — Tailwind
         * v4's own theme variables, consumed by the `font-normal` … `font-bold` utilities. */
        fontWeights: { normal: number; medium: number; semibold: number; bold: number };
        /** Type scale → `--text-xs` … `--text-xl` — Tailwind v4's own theme variables, consumed by
         * the `text-xs` … `text-xl` utilities. */
        scale: { xs: string; sm: string; base: string; lg: string; xl: string };
    };
    /** → `--block-border-radius*`. */
    radii: { block: string; blockLarge: string; blockSmall: string; blockTiny: string };
    /** → `--block-padding` / `--block-spacer`. */
    spacing: { blockPadding: string; blockSpacer: string };
    /** → `--product-card-shadow` / `--product-card-shadow-hover` / `--header-panel-shadow`. */
    elevation: { card: string; cardHover: string; panel: string };
    productCard: ResolvedProductCardTokens;
    cartLine: ResolvedCartLineTokens;
}

/**
 * Recursively optional view of a type. Plain objects become partial at every depth, arrays keep
 * their full (non-partial) element type and are replaced wholesale, and primitives pass through.
 * Used to derive the authored `ShopThemeTokens` from the resolved shape so the schema lives once.
 */
type DeepPartial<T> =
    T extends ReadonlyArray<infer U> ? U[] : T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

/**
 * Authored, all-optional theme overrides stored on the shop record (`ShopBase.theme`). A
 * `DeepPartial` of {@link ResolvedShopTheme}: a shop may set any subset of tokens at any depth, and
 * every absent token falls back to its platform default via {@link resolveTheme}. An absent `theme`
 * (the default for every existing shop) therefore resolves byte-identically to today's render.
 *
 * @example
 * ```ts
 * import type { ShopThemeTokens } from '@nordcom/commerce-db';
 * const theme: ShopThemeTokens = { colors: { background: '#0b0b0b', foreground: '#fafafa' } };
 * ```
 */
export type ShopThemeTokens = DeepPartial<ResolvedShopTheme>;

/**
 * Minimal shop shape accepted by {@link resolveTheme}. `OnlineShop` (and `ShopBase`) satisfy it
 * structurally; tests can pass a bare object. `design.accents` is the fallback accent source when
 * `theme.colors.accents` is unset, preserving today's behavior.
 */
export type ThemeResolutionInput = {
    design?: { accents?: ReadonlyArray<AccentToken> | null } | null;
    theme?: ShopThemeTokens | null;
};

/**
 * The single source of truth for platform theme defaults. Mirrors the literal values emitted by
 * `apps/storefront/src/app/globals.css` (and the previously hardcoded chrome colors in
 * `css-variables.tsx`) so a shop with no `theme` resolves to today's exact render. Defaults live
 * here and nowhere else.
 */
export const THEME_DEFAULTS: ResolvedShopTheme = {
    colors: {
        background: '#fefefe',
        foreground: '#101418',
        accents: [],
        surface: { base: '#f3f3f3', raised: '#f5f5f5', sunken: '#d8d8d8' },
        text: { default: '#222222', muted: '#555555' },
        border: { default: '#ece6d4', strong: '#d8d8d8' },
        state: { sale: '#b51200', danger: '#a53d3a', success: '#3b9e2e', info: '#6dc0d5' },
        focusRing: 'var(--accent)',
        sectionDark: '#051821',
    },
    typography: {
        fontFamily: 'public-sans',
        headingFamily: 'public-sans',
        fontWeights: { normal: 400, medium: 500, semibold: 600, bold: 700 },
        scale: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem' },
    },
    radii: {
        block: '0.75rem',
        blockLarge: '1rem',
        blockSmall: 'calc(var(--block-border-radius) * 0.75)',
        blockTiny: '0.325rem',
    },
    spacing: { blockPadding: '0.6rem', blockSpacer: '0.55rem' },
    elevation: {
        card: '0 1px 0 rgb(20 17 11 / 2%), 0 1px 2px rgb(20 17 11 / 4%)',
        cardHover: '0 1px 0 rgb(20 17 11 / 2%), 0 10px 24px -12px rgb(20 17 11 / 22%)',
        panel: '0 24px 60px -24px rgb(15 23 42 / 0.18), 0 8px 20px -8px rgb(15 23 42 / 0.08)',
    },
    productCard: {
        bg: '#ffffff',
        borderColor: '#ece6d4',
        borderWidth: '1px',
        radius: '12px',
        padding: '10px',
        gap: '8px',
        shadow: '0 1px 0 rgb(20 17 11 / 2%), 0 1px 2px rgb(20 17 11 / 4%)',
        shadowHover: '0 1px 0 rgb(20 17 11 / 2%), 0 10px 24px -12px rgb(20 17 11 / 22%)',
        minWidth: '200px',
        maxWidth: '240px',
        gridAlign: 'start',
        railEdgeStyle: 'fade',
        searchImageWidth: '72px',

        imageRadius: '8px',
        imagePadding: '12px',
        imageFit: 'cover',
        imageHoverSwap: 'on',
        imageSizes: '(max-width: 768px) 50vw, 240px',
        aspectVertical: '4 / 5',
        aspectHorizontal: '4 / 5',
        aspectHorizontalSquare: '1 / 1',
        aspectMicro: '1 / 1',

        vendorColor: '#6b6555',
        vendorSize: '11px',
        titleColor: '#14110b',
        titleSize: '14px',
        titleWeight: 600,
        titleLineClamp: 2,
        priceColor: '#14110b',
        priceSize: '15px',
        priceWeight: 700,
        compareColor: '#6b6555',
        urgencyColor: '#b54a2a',
        urgencyThreshold: 5,
        eyebrowTracking: '0.14em',

        swatchSize: '18px',
        swatchGap: '5px',
        swatchRingColor: '#14110b',
        swatchHitPadding: '6px',

        chipBg: '#ffffff',
        chipColor: '#14110b',
        chipBorder: '#ece6d4',
        chipActiveBg: '#14110b',
        chipActiveColor: '#ffffff',
        chipPaddingY: '6px',
        chipPaddingX: '10px',
        moreBg: '#f3eedc',
        moreColor: '#4a463b',
        moreSize: '11px',
        moreWeight: 600,
        moreMinSize: '24px',

        ctaBg: '#14110b',
        ctaColor: '#ffffff',
        ctaRadius: '8px',
        ctaPaddingY: '11px',
        ctaHeight: '36px',
        ctaPlacement: 'float-pill',
        ctaPillPosition: 'top-right',
        ctaPillLabel: '',
        ctaPillIcon: '+',
        ctaPillReveal: 'always',
        ctaInlineStyle: 'solid',
        fastPathDot: '#2f7d4a',
        fastPathSingleVariant: 'on',
        quickAddPresentation: 'auto',

        overlayBg: '#ffffff',
        overlayRadius: '12px',
        overlayBorderColor: '#ece6d4',
        overlayShadow: '0 12px 32px -8px rgb(20 17 11 / 25%)',
        overlayWidth: '260px',
        overlayMaxHeight: '320px',
        overlayPadding: '14px',

        oosOpacity: 0.7,
        oosImageSaturate: 0.85,

        motionEase: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        motionFast: '80ms',
        motionBase: '160ms',
        motionPickerIn: '220ms',
        motionPickerOut: '180ms',
        motionHoverDuration: '200ms',
        motionHoverEase: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        motionImageSwapDuration: '400ms',
        motionOverlayInDuration: '180ms',
        motionOverlayInEase: 'cubic-bezier(0.32, 0.72, 0, 1)',

        saleStyle: 'strike-only',
        saleStrikeColor: 'currentColor',
        saleStrikeAngle: '-8deg',
        saleStrikeExtend: '2px',
        saleCurrentColor: '#b54a2a',
        saleShowSavingsLine: 'off',
        saleBadgeStyle: 'default',
        saleBadgePosition: 'top-left',
        saleBadgeText: '−{n}%',
        saleBadgeMinDiscount: 11,
        saleBadgeAllowOverlap: false,
    },
    cartLine: {
        imageSize: '88px',
        imageRadius: '8px',
        gap: '1rem',
        paddingY: '1rem',
        dividerColor: '#ece6d4',
        variantStyle: 'swatch',
        showVendor: true,
        showSku: false,
    },
};

/**
 * Narrows a value to a non-null plain object (`{}`-literal or `Object.create(null)`). Class
 * instances and arrays are excluded so the merge never recurses into non-token values.
 *
 * @param value - Arbitrary value to test.
 * @returns `true` when `value` is a plain object.
 */
const isPlainObject = (value: unknown): value is Record<string, unknown> => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
};

// Keys that could pollute `Object.prototype` if copied from an attacker-controlled override.
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Deep-clones `base` while overlaying any defined values from `override`, producing a fresh tree
 * that never aliases or mutates `base`. Plain objects merge key-by-key over the union of keys (so a
 * shop may set an override-only key such as an accent shade that the defaults omit); arrays are
 * replaced wholesale; primitives take the override only when it is non-nullish, so a persisted
 * `null` leaf falls back to the base default instead of emitting `null` while authored `false`/`0`/
 * `''` are preserved. Prototype-polluting keys are skipped.
 *
 * @param base - The default value tree (a {@link ResolvedShopTheme} node).
 * @param override - The authored partial override for this node, or `undefined`.
 * @returns A new value with overrides applied, structurally matching `base`.
 */
const cloneAndMerge = (base: unknown, override: unknown): unknown => {
    if (Array.isArray(base)) {
        return Array.isArray(override) ? [...override] : [...base];
    }

    if (isPlainObject(base)) {
        const overrideObj = isPlainObject(override) ? override : {};
        const out: Record<string, unknown> = {};
        const keys = new Set([...Object.keys(base), ...Object.keys(overrideObj)]);
        for (const key of keys) {
            if (FORBIDDEN_KEYS.has(key)) continue;
            const overrideValue = Object.hasOwn(overrideObj, key) ? overrideObj[key] : undefined;
            out[key] = cloneAndMerge(base[key], overrideValue);
        }
        return out;
    }

    return override ?? base;
};

/**
 * Narrows an arbitrary string to a known {@link FONT_FAMILIES} key.
 *
 * @param value - The authored or resolved font key to test.
 * @returns `true` when `value` is an allowlisted font key.
 */
const isFontFamilyKey = (value: string): value is FontFamilyKey => Object.hasOwn(FONT_FAMILIES, value);

/**
 * Resolves a shop's authored theme overrides against the platform defaults into a fully-populated
 * token map. This is the single default-resolution entry point: the storefront serializer (P3-2)
 * calls it and never reaches for a literal default itself. A shop with no `theme` resolves to
 * {@link THEME_DEFAULTS} exactly, so existing tenants render byte-identically and need no migration.
 *
 * Accents resolve `theme.colors.accents (when non-empty) → design.accents → []`: an explicitly-empty
 * `theme.colors.accents` falls through to `design.accents` rather than blanking branding, preserving
 * the existing accent-source behavior. The four accent light/dark shades are populated only when the
 * shop overrides them; otherwise they stay absent so the storefront keeps deriving them via `colord`.
 *
 * Typography font keys are narrowed against {@link FONT_FAMILIES}: an authored value that is not an
 * allowlisted key (stale data, a hand-edited record) falls back to the platform-default font key so
 * the storefront only ever resolves a family it can statically load via `next/font`.
 *
 * @param shop - The shop record (or any {@link ThemeResolutionInput}-shaped object) to resolve.
 * @returns A fresh {@link ResolvedShopTheme} with every token populated to a concrete value.
 * @throws {TypeError} When `shop` is `null` or not an object.
 */
export const resolveTheme = (shop: ThemeResolutionInput): ResolvedShopTheme => {
    if (shop === null || typeof shop !== 'object') {
        throw new TypeError('resolveTheme requires a shop object');
    }

    const resolved = cloneAndMerge(THEME_DEFAULTS, shop.theme ?? undefined) as ResolvedShopTheme;

    const themeAccents = shop.theme?.colors?.accents;
    const accents =
        themeAccents && themeAccents.length > 0
            ? themeAccents
            : (shop.design?.accents ?? THEME_DEFAULTS.colors.accents);
    resolved.colors.accents = accents.map((accent) => ({ ...accent }));

    if (!isFontFamilyKey(resolved.typography.fontFamily)) {
        resolved.typography.fontFamily = THEME_DEFAULTS.typography.fontFamily;
    }
    if (!isFontFamilyKey(resolved.typography.headingFamily)) {
        resolved.typography.headingFamily = THEME_DEFAULTS.typography.headingFamily;
    }

    return resolved;
};

/**
 * Resolved primary/secondary brand accents fed to {@link serializeThemeToCssVars}. `null` means the
 * shop has no branding, in which case the accent fan-out and the chrome literals are skipped (page
 * chrome falls back to its diff-from-default path instead).
 */
export type ThemeBranding = { primary: AccentToken; secondary: AccentToken };

/**
 * One emitted CSS declaration as a `[customProperty, value]` pair. Pairs whose property is the empty
 * string are layout-only sentinels (a blank separator line or the legacy-alias comment) that the SSR
 * `<style>` renderer reproduces verbatim for byte-stability; the live-preview consumer skips them
 * (only `--`-prefixed properties are applied via `setProperty`).
 */
export type ThemeCssVar = [cssVar: string, value: string];

// Characters that could terminate a `:root` declaration, the rule, or the `<style>` element and let
// a tenant-authored token inject arbitrary CSS/markup. A value carrying any of them is rejected.
const UNSAFE_CSS_VALUE = /[;{}<>@]/;

/**
 * Guards a serialized token value against style-element-breakout injection. Theme tokens — brand
 * accents and the ~90 free-text product-card knobs — are authored by tenant admins, so a value
 * carrying a declaration, rule, comment, or element terminator could escape its declaration and
 * inject arbitrary CSS or markup. Such a value is rejected so the caller skips the declaration and
 * falls back to the platform default instead of emitting attacker-controlled content.
 *
 * @param value - The resolved token value (string, number, or boolean).
 * @param quoted - Whether the value is emitted inside CSS quotes; quoted values additionally reject
 *   the quote and backslash so they cannot terminate or escape the CSS string.
 * @returns The safe value to interpolate, or `null` when the value must be skipped.
 */
const sanitizeCssValue = (value: string | number | boolean, quoted: boolean): string | null => {
    if (typeof value !== 'string') {
        return String(value);
    }

    if (UNSAFE_CSS_VALUE.test(value) || value.includes('*' + '/')) {
        return null;
    }

    if (quoted && (value.includes('"') || value.includes('\\'))) {
        return null;
    }

    return value;
};

/**
 * Appends a `[cssVar, value]` pair for every entry whose resolved value differs from its platform
 * default. A theme-less shop resolves every entry to its default, so nothing is appended and the
 * static globals.css base renders unchanged. Values that fail {@link sanitizeCssValue} are skipped.
 *
 * @param pairs - The accumulating declaration buffer, mutated in place.
 * @param entries - `[cssVar, resolvedValue, defaultValue]` tuples for one or more token groups.
 * @returns Nothing; `pairs` is mutated in place.
 */
const appendOverriddenTokens = (
    pairs: ThemeCssVar[],
    entries: ReadonlyArray<readonly [cssVar: string, value: string | number, defaultValue: string | number]>,
): void => {
    for (const [cssVar, value, defaultValue] of entries) {
        if (value === defaultValue) {
            continue;
        }

        const safe = sanitizeCssValue(value, false);
        if (safe === null) {
            continue;
        }

        pairs.push([cssVar, safe]);
    }
};

/**
 * Appends a sanitized `[cssVar, value]` pair for every entry unconditionally. Used for groups emitted
 * whenever branding resolves (page chrome and the accent quartets), where omitting the default would
 * change the no-`<style>` fallback rather than preserve it. A value failing {@link sanitizeCssValue}
 * is skipped, falling back to the globals.css default.
 *
 * @param pairs - The accumulating declaration buffer, mutated in place.
 * @param entries - `[cssVar, value]` tuples to emit.
 * @returns Nothing; `pairs` is mutated in place.
 */
const appendTokens = (
    pairs: ThemeCssVar[],
    entries: ReadonlyArray<readonly [cssVar: string, value: string | number]>,
): void => {
    for (const [cssVar, value] of entries) {
        const safe = sanitizeCssValue(value, false);
        if (safe !== null) {
            pairs.push([cssVar, safe]);
        }
    }
};

/**
 * Appends a `[cssVar, value]` pair for every product-card knob whose resolved value differs from the
 * platform default, mapping each knob to its custom property via {@link productCardCustomProperty} and
 * wrapping quoted knobs in CSS quotes. Values that fail {@link sanitizeCssValue} are skipped.
 *
 * @param pairs - The accumulating declaration buffer, mutated in place.
 * @param resolved - The shop's resolved product-card token map.
 * @returns Nothing; `pairs` is mutated in place.
 */
const appendProductCardTokens = (pairs: ThemeCssVar[], resolved: ResolvedProductCardTokens): void => {
    for (const key of Object.keys(THEME_DEFAULTS.productCard) as (keyof ResolvedProductCardTokens)[]) {
        const value = resolved[key];
        if (value === THEME_DEFAULTS.productCard[key]) {
            continue;
        }

        const quoted = isQuotedProductCardKey(key);
        const safe = sanitizeCssValue(value, quoted);
        if (safe === null) {
            continue;
        }

        pairs.push([productCardCustomProperty(key), quoted ? `"${safe}"` : safe]);
    }
};

/**
 * Appends a `[cssVar, value]` pair for every cart-line knob whose resolved value differs from the
 * platform default, mapping each knob to its `--cart-line-*` custom property. None of the cart-line
 * knobs are logical content, so none are quoted. Values that fail {@link sanitizeCssValue} are skipped.
 *
 * @param pairs - The accumulating declaration buffer, mutated in place.
 * @param resolved - The shop's resolved cart-line token map.
 * @returns Nothing; `pairs` is mutated in place.
 */
const appendCartLineTokens = (pairs: ThemeCssVar[], resolved: ResolvedCartLineTokens): void => {
    for (const key of Object.keys(THEME_DEFAULTS.cartLine) as (keyof ResolvedCartLineTokens)[]) {
        const value = resolved[key];
        if (value === THEME_DEFAULTS.cartLine[key]) {
            continue;
        }

        const safe = sanitizeCssValue(value, false);
        if (safe === null) {
            continue;
        }

        pairs.push([cartLineCustomProperty(key), safe]);
    }
};

/**
 * Serializes a shop's resolved theme into the ordered list of CSS custom-property declarations the
 * storefront emits, so SSR and the admin live-preview compute the **same** output byte-for-byte. The
 * function is pure and isomorphic (no `server-only`, no I/O); callers resolve the shop and its
 * branding first.
 *
 * Most groups emit diff-from-default — only when the resolved value differs from {@link THEME_DEFAULTS}
 * — so a theme-less shop returns `[]` and the globals.css base renders unchanged. Page chrome
 * (`--color-background` / `--color-foreground`) has no globals.css base, so it is emitted at its
 * resolved value whenever branding resolves (matching the historical branding-`<style>` behavior) and
 * diff-from-default otherwise. When branding resolves, the four accent shades are emitted — either the
 * theme-pinned override or the runtime `colord` derivation of the base accent — followed by the legacy
 * `--accent-*` aliases. Every value passes {@link sanitizeCssValue}; a rejected value is skipped so the
 * platform default applies.
 *
 * @param theme - The resolved theme token map (from {@link resolveTheme}).
 * @param branding - The resolved primary/secondary accents, or `null` when the shop has no branding.
 * @returns Ordered `[cssVar, value]` pairs (including blank/comment sentinels for SSR formatting), or
 *   an empty array when no tenant override differs from the defaults.
 */
export const serializeThemeToCssVars = (theme: ResolvedShopTheme, branding: ThemeBranding | null): ThemeCssVar[] => {
    const pairs: ThemeCssVar[] = [];

    const { colors, radii, spacing, elevation, typography } = theme;
    const d = THEME_DEFAULTS;

    // Page chrome has no globals.css base, so it cannot go through diff-from-default without changing
    // the no-branding fallback: a branded shop emits the resolved literals, an unbranded shop emits
    // them only when explicitly overridden (body otherwise falls back to `--color-bright`/`--color-dark`).
    if (branding) {
        appendTokens(pairs, [
            ['--color-background', colors.background],
            ['--color-foreground', colors.foreground],
        ]);
    } else {
        appendOverriddenTokens(pairs, [
            ['--color-background', colors.background, d.colors.background],
            ['--color-foreground', colors.foreground, d.colors.foreground],
        ]);
    }

    appendOverriddenTokens(pairs, [
        // Surface ramp → `--color-block*` (semantic `--surface-*` alias these).
        ['--color-block', colors.surface.base, d.colors.surface.base],
        ['--color-block-light', colors.surface.raised, d.colors.surface.raised],
        ['--color-block-dark', colors.surface.sunken, d.colors.surface.sunken],

        // Body text ramp → `--color-dark*` (semantic `--text` / `--text-muted` alias these).
        ['--color-dark', colors.text.default, d.colors.text.default],
        ['--color-dark-secondary', colors.text.muted, d.colors.text.muted],

        // Border ramp → semantic `--border-*` (no legacy consumer; live once P5 migrates).
        ['--border-default', colors.border.default, d.colors.border.default],
        ['--border-strong', colors.border.strong, d.colors.border.strong],

        // State ramp → `--color-sale` / `--color-danger` / `--color-block-success` /
        // `--color-block-info` (semantic `--state-*` alias these; live once P5 migrates).
        ['--color-sale', colors.state.sale, d.colors.state.sale],
        ['--color-danger', colors.state.danger, d.colors.state.danger],
        ['--color-block-success', colors.state.success, d.colors.state.success],
        ['--color-block-info', colors.state.info, d.colors.state.info],

        // Focus ring → semantic `--focus-ring` (no consumer until P5; components use `--accent`).
        ['--focus-ring', colors.focusRing, d.colors.focusRing],

        // Dark-section fill → `--section-dark-bg` (the CMS `colorScheme: dark` surface).
        ['--section-dark-bg', colors.sectionDark, d.colors.sectionDark],

        // Block radii / spacing → consumed live throughout the storefront.
        ['--block-border-radius', radii.block, d.radii.block],
        ['--block-border-radius-large', radii.blockLarge, d.radii.blockLarge],
        ['--block-border-radius-small', radii.blockSmall, d.radii.blockSmall],
        ['--block-border-radius-tiny', radii.blockTiny, d.radii.blockTiny],
        ['--block-padding', spacing.blockPadding, d.spacing.blockPadding],
        ['--block-spacer', spacing.blockSpacer, d.spacing.blockSpacer],

        // Type scale / weights → Tailwind v4 theme vars consumed by `text-*` / `font-*` utilities.
        ['--text-xs', typography.scale.xs, d.typography.scale.xs],
        ['--text-sm', typography.scale.sm, d.typography.scale.sm],
        ['--text-base', typography.scale.base, d.typography.scale.base],
        ['--text-lg', typography.scale.lg, d.typography.scale.lg],
        ['--text-xl', typography.scale.xl, d.typography.scale.xl],
        ['--font-weight-normal', typography.fontWeights.normal, d.typography.fontWeights.normal],
        ['--font-weight-medium', typography.fontWeights.medium, d.typography.fontWeights.medium],
        ['--font-weight-semibold', typography.fontWeights.semibold, d.typography.fontWeights.semibold],
        ['--font-weight-bold', typography.fontWeights.bold, d.typography.fontWeights.bold],

        // Elevation → `--product-card-shadow*` / `--header-panel-shadow`. The card shadows overlap
        // the product-card knobs, emitted last so they win on the rare both-set collision.
        ['--product-card-shadow', elevation.card, d.elevation.card],
        ['--product-card-shadow-hover', elevation.cardHover, d.elevation.cardHover],
        ['--header-panel-shadow', elevation.panel, d.elevation.panel],
    ]);

    if (branding) {
        if (pairs.length > 0) {
            pairs.push(['', '']);
        }

        // The four shades default to a runtime `colord` derivation of the base accent, but a shop
        // may pin any of them via theme tokens.
        const primaryLight =
            colors.accentPrimaryLight ?? colord(branding.primary.color).lighten(0.115).saturate(0.15).toHex();
        const primaryDark = colors.accentPrimaryDark ?? colord(branding.primary.color).darken(0.05).toHex();
        const secondaryLight =
            colors.accentSecondaryLight ?? colord(branding.secondary.color).lighten(0.195).saturate(0.15).toHex();
        const secondaryDark = colors.accentSecondaryDark ?? colord(branding.secondary.color).darken(0.15).toHex();

        // Accents reach the markup from admin-authored `design.accents` or the Shopify Brand API, so
        // each value is sanitized; a malformed accent is skipped (the globals.css default applies).
        appendTokens(pairs, [
            ['--color-accent-primary', branding.primary.color],
            ['--color-accent-primary-text', branding.primary.foreground],
            ['--color-accent-primary-light', primaryLight],
            ['--color-accent-primary-dark', primaryDark],
        ]);
        pairs.push(['', '']);
        appendTokens(pairs, [
            ['--color-accent-secondary', branding.secondary.color],
            ['--color-accent-secondary-text', branding.secondary.foreground],
            ['--color-accent-secondary-light', secondaryLight],
            ['--color-accent-secondary-dark', secondaryDark],
        ]);

        pairs.push(
            ['', ''],
            ['', '/* Legacy accent aliases, kept until consumers migrate to --color-accent-*. */'],
            ['--accent-primary', 'var(--color-accent-primary)'],
            ['--accent-primary-light', 'var(--color-accent-primary-light)'],
            ['--accent-primary-dark', 'var(--color-accent-primary-dark)'],
            ['--accent-secondary', 'var(--color-accent-secondary)'],
            ['--accent-secondary-light', 'var(--color-accent-secondary-light)'],
            ['--accent-secondary-dark', 'var(--color-accent-secondary-dark)'],
        );
    }

    const productCard: ThemeCssVar[] = [];
    appendProductCardTokens(productCard, theme.productCard);
    if (productCard.length > 0) {
        if (pairs.length > 0) {
            pairs.push(['', '']);
        }
        pairs.push(...productCard);
    }

    const cartLine: ThemeCssVar[] = [];
    appendCartLineTokens(cartLine, theme.cartLine);
    if (cartLine.length > 0) {
        if (pairs.length > 0) {
            pairs.push(['', '']);
        }
        pairs.push(...cartLine);
    }

    return pairs;
};
