import { TypeError } from '@nordcom/commerce-errors';

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
