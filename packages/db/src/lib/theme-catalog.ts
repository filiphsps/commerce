import type { ResolvedCartLineTokens, ResolvedProductCardTokens, ResolvedShopTheme } from './theme';

/**
 * The kind of value a theme token holds, driving which admin control renders for it. `color` →
 * swatch + hex/CSS text; `dimension` → free-text (rem/px/%/aspect/shadow/duration); `number` →
 * numeric input; `enum` → select; `boolean` → switch.
 */
export type ValueKind = 'color' | 'dimension' | 'number' | 'enum' | 'boolean';

/**
 * Top-level catalog grouping, mirroring the structure of {@link ResolvedShopTheme} plus the
 * data-driven `sections` group (whose rows live on `shops.featureFlags`, not on the theme tree).
 */
export type ThemeGroup =
    | 'colors'
    | 'typography'
    | 'radii'
    | 'spacing'
    | 'elevation'
    | 'productCard'
    | 'cartLine'
    | 'sections';

/**
 * Fallback widget kind for a theme token's generic form control — the four kinds the editor's
 * auto-render offers when no richer `valueKind` control applies. The name is a holdover from the
 * retired Payload-era field builder; the widgets themselves render on the native form core.
 */
export type PayloadType = 'text' | 'select' | 'number' | 'checkbox';

/**
 * Metadata describing exactly one {@link ResolvedShopTheme} leaf. The catalog is the single source
 * the admin UI, the fallback field builder, and the serializer all iterate. It carries **no default
 * value** — defaults are deep-got from `THEME_DEFAULTS` at `path`, keeping them single-sourced.
 *
 * @remarks `cssVar` is hand-authored for the structured groups (copied from the `ResolvedShopTheme`
 * JSDoc) and mechanically generated via {@link productCardCustomProperty} for `productCard`.
 */
export type ThemeTokenMeta = {
    /** Top-level grouping for the left-rail nav. */
    group: ThemeGroup;
    /** Sub-grouping (accordion cluster) within the group. */
    cluster: string;
    /** Persisted dotted FormState/`useField` key, e.g. `theme.productCard.bg`. */
    path: string;
    /** Emitted CSS custom property (including the leading `--`). */
    cssVar: string;
    /** The value kind, selecting the admin control. */
    valueKind: ValueKind;
    /** Fallback generic-widget kind (see {@link PayloadType}). */
    payloadType: PayloadType;
    /** Allowed values for an `enum`; a single-element list renders a read-only select. */
    enumValues?: readonly string[];
    /** Lower bound for a `number` control (inclusive). */
    min?: number;
    /** Upper bound for a `number` control (inclusive). */
    max?: number;
    /** Step increment for a `number` control. */
    step?: number;
    /** The serializer wraps the value in CSS quotes on emit (logical content). */
    quoted?: true;
    /** LEGACY knob, slated for the Phase-3 product-card removal; sits behind the Advanced disclosure. */
    deprecated?: true;
    /** Exposed but has no storefront consumer yet — a no-op in preview. */
    forthcoming?: true;
    /** Optional/absent by default; reset CLEARS the value (`setValue(undefined)`), never writes a default. */
    derived?: true;
};

/**
 * Converts a camelCase token key to kebab-case for use in a CSS custom-property name.
 *
 * @param value - The camelCase key (e.g. `borderColor`).
 * @returns The kebab-case form (e.g. `border-color`).
 */
export const kebabCase = (value: string): string => value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

// Product-card knobs whose camelCase token name maps to the `--aspect-product-card-*` namespace
// rather than `--product-card-*` (see `ResolvedProductCardTokens`).
const PRODUCT_CARD_ASPECT_KEYS = new Set<keyof ResolvedProductCardTokens>([
    'aspectVertical',
    'aspectHorizontal',
    'aspectHorizontalSquare',
    'aspectMicro',
]);

// Knobs whose value is logical content (a CSS string literal), wrapped in CSS quotes on emit.
const PRODUCT_CARD_QUOTED_KEYS = new Set<keyof ResolvedProductCardTokens>([
    'imageSizes',
    'ctaPillLabel',
    'ctaPillIcon',
    'saleBadgeText',
]);

/**
 * Maps a {@link ResolvedProductCardTokens} key to the CSS custom property it serializes to. Aspect
 * knobs target the `--aspect-product-card-*` namespace; every other knob targets `--product-card-*`.
 *
 * @param key - The resolved product-card token key.
 * @returns The CSS custom-property name (including the leading `--`).
 */
export const productCardCustomProperty = (key: keyof ResolvedProductCardTokens): string => {
    if (PRODUCT_CARD_ASPECT_KEYS.has(key)) {
        return `--aspect-product-card-${kebabCase(key).replace(/^aspect-/, '')}`;
    }

    return `--product-card-${kebabCase(key)}`;
};

/**
 * Reports whether a product-card knob's value is logical content the serializer wraps in CSS quotes
 * on emit (`imageSizes`, the CTA-pill label/icon, the sale-badge text).
 *
 * @param key - The resolved product-card token key.
 * @returns `true` when the value is emitted inside CSS quotes.
 */
export const isQuotedProductCardKey = (key: keyof ResolvedProductCardTokens): boolean =>
    PRODUCT_CARD_QUOTED_KEYS.has(key);

/**
 * Maps a {@link ResolvedCartLineTokens} key to the `--cart-line-*` custom property it serializes to.
 *
 * @param key - The resolved cart-line token key.
 * @returns The CSS custom-property name (including the leading `--`).
 */
export const cartLineCustomProperty = (key: keyof ResolvedCartLineTokens): string => `--cart-line-${kebabCase(key)}`;

/**
 * Every valid dotted path into {@link ResolvedShopTheme}, prefixed with the persisted `theme` root.
 * Arrays contribute an indexed `[]` segment (e.g. `theme.colors.accents[].color`) and optional leaves
 * (the derived accent shades) are included via `NonNullable`. Used to type-check that every catalog
 * `path` addresses a real theme node at compile time.
 */
type ThemePathsOf<T, P extends string> =
    T extends ReadonlyArray<infer U>
        ? ThemePathsOf<U, `${P}[]`>
        : T extends object
          ? { [K in keyof T & string]: `${P}.${K}` | ThemePathsOf<NonNullable<T[K]>, `${P}.${K}`> }[keyof T & string]
          : never;

/** A persisted dotted theme path (`theme.…`) addressing a {@link ResolvedShopTheme} node. */
export type ThemeTokenPath = ThemePathsOf<ResolvedShopTheme, 'theme'>;

/**
 * The complete, declaration-ordered token catalog. Every entry mirrors exactly one
 * {@link ResolvedShopTheme} leaf (140 rows total: colors 21, typography 11, radii 4, spacing 2,
 * elevation 3, productCard 94, cartLine 5). Structured-group `cssVar`s are hand-authored from the
 * `ResolvedShopTheme` JSDoc; `productCard` `cssVar`s are generated via {@link productCardCustomProperty}.
 * Defaults are intentionally absent — deep-get them from `THEME_DEFAULTS` at each `path`.
 */
export const THEME_TOKEN_CATALOG = [
    // ── colors ──────────────────────────────────────────────────────────────
    {
        group: 'colors',
        cluster: 'base',
        path: 'theme.colors.background',
        cssVar: '--color-background',
        valueKind: 'color',
        payloadType: 'text',
    },
    {
        group: 'colors',
        cluster: 'base',
        path: 'theme.colors.foreground',
        cssVar: '--color-foreground',
        valueKind: 'color',
        payloadType: 'text',
    },

    {
        group: 'colors',
        cluster: 'accents',
        path: 'theme.colors.accents[].type',
        cssVar: '--color-accent-type',
        valueKind: 'enum',
        payloadType: 'select',
        enumValues: ['primary', 'secondary'],
    },
    {
        group: 'colors',
        cluster: 'accents',
        path: 'theme.colors.accents[].color',
        cssVar: '--color-accent',
        valueKind: 'color',
        payloadType: 'text',
    },
    {
        group: 'colors',
        cluster: 'accents',
        path: 'theme.colors.accents[].foreground',
        cssVar: '--color-accent-foreground',
        valueKind: 'color',
        payloadType: 'text',
    },
    {
        group: 'colors',
        cluster: 'accents',
        path: 'theme.colors.accentPrimaryLight',
        cssVar: '--color-accent-primary-light',
        valueKind: 'color',
        payloadType: 'text',
        derived: true,
    },
    {
        group: 'colors',
        cluster: 'accents',
        path: 'theme.colors.accentPrimaryDark',
        cssVar: '--color-accent-primary-dark',
        valueKind: 'color',
        payloadType: 'text',
        derived: true,
    },
    {
        group: 'colors',
        cluster: 'accents',
        path: 'theme.colors.accentSecondaryLight',
        cssVar: '--color-accent-secondary-light',
        valueKind: 'color',
        payloadType: 'text',
        derived: true,
    },
    {
        group: 'colors',
        cluster: 'accents',
        path: 'theme.colors.accentSecondaryDark',
        cssVar: '--color-accent-secondary-dark',
        valueKind: 'color',
        payloadType: 'text',
        derived: true,
    },

    {
        group: 'colors',
        cluster: 'surface',
        path: 'theme.colors.surface.base',
        cssVar: '--color-block',
        valueKind: 'color',
        payloadType: 'text',
    },
    {
        group: 'colors',
        cluster: 'surface',
        path: 'theme.colors.surface.raised',
        cssVar: '--color-block-light',
        valueKind: 'color',
        payloadType: 'text',
    },
    {
        group: 'colors',
        cluster: 'surface',
        path: 'theme.colors.surface.sunken',
        cssVar: '--color-block-dark',
        valueKind: 'color',
        payloadType: 'text',
    },

    {
        group: 'colors',
        cluster: 'text',
        path: 'theme.colors.text.default',
        cssVar: '--color-dark',
        valueKind: 'color',
        payloadType: 'text',
    },
    {
        group: 'colors',
        cluster: 'text',
        path: 'theme.colors.text.muted',
        cssVar: '--color-dark-secondary',
        valueKind: 'color',
        payloadType: 'text',
    },

    {
        group: 'colors',
        cluster: 'border',
        path: 'theme.colors.border.default',
        cssVar: '--border-default',
        valueKind: 'color',
        payloadType: 'text',
        forthcoming: true,
    },
    {
        group: 'colors',
        cluster: 'border',
        path: 'theme.colors.border.strong',
        cssVar: '--border-strong',
        valueKind: 'color',
        payloadType: 'text',
        forthcoming: true,
    },

    {
        group: 'colors',
        cluster: 'state',
        path: 'theme.colors.state.sale',
        cssVar: '--color-sale',
        valueKind: 'color',
        payloadType: 'text',
    },
    {
        group: 'colors',
        cluster: 'state',
        path: 'theme.colors.state.danger',
        cssVar: '--color-danger',
        valueKind: 'color',
        payloadType: 'text',
    },
    {
        group: 'colors',
        cluster: 'state',
        path: 'theme.colors.state.success',
        cssVar: '--color-block-success',
        valueKind: 'color',
        payloadType: 'text',
    },
    {
        group: 'colors',
        cluster: 'state',
        path: 'theme.colors.state.info',
        cssVar: '--color-block-info',
        valueKind: 'color',
        payloadType: 'text',
    },

    {
        group: 'colors',
        cluster: 'focus',
        path: 'theme.colors.focusRing',
        cssVar: '--focus-ring',
        valueKind: 'color',
        payloadType: 'text',
        forthcoming: true,
    },

    // ── typography ──────────────────────────────────────────────────────────
    // The two font rows expose no `enumValues`: the font-preview control supplies the FONT_FAMILIES
    // options itself (rendered each in its own typeface), keeping the catalog free of a runtime
    // dependency on the font allowlist.
    {
        group: 'typography',
        cluster: 'family',
        path: 'theme.typography.fontFamily',
        cssVar: '--font-primary',
        valueKind: 'enum',
        payloadType: 'select',
    },
    {
        group: 'typography',
        cluster: 'family',
        path: 'theme.typography.headingFamily',
        cssVar: '--font-heading',
        valueKind: 'enum',
        payloadType: 'select',
    },

    {
        group: 'typography',
        cluster: 'weights',
        path: 'theme.typography.fontWeights.normal',
        cssVar: '--font-weight-normal',
        valueKind: 'number',
        payloadType: 'number',
        min: 100,
        max: 900,
        step: 100,
    },
    {
        group: 'typography',
        cluster: 'weights',
        path: 'theme.typography.fontWeights.medium',
        cssVar: '--font-weight-medium',
        valueKind: 'number',
        payloadType: 'number',
        min: 100,
        max: 900,
        step: 100,
    },
    {
        group: 'typography',
        cluster: 'weights',
        path: 'theme.typography.fontWeights.semibold',
        cssVar: '--font-weight-semibold',
        valueKind: 'number',
        payloadType: 'number',
        min: 100,
        max: 900,
        step: 100,
    },
    {
        group: 'typography',
        cluster: 'weights',
        path: 'theme.typography.fontWeights.bold',
        cssVar: '--font-weight-bold',
        valueKind: 'number',
        payloadType: 'number',
        min: 100,
        max: 900,
        step: 100,
    },

    {
        group: 'typography',
        cluster: 'scale',
        path: 'theme.typography.scale.xs',
        cssVar: '--text-xs',
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'typography',
        cluster: 'scale',
        path: 'theme.typography.scale.sm',
        cssVar: '--text-sm',
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'typography',
        cluster: 'scale',
        path: 'theme.typography.scale.base',
        cssVar: '--text-base',
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'typography',
        cluster: 'scale',
        path: 'theme.typography.scale.lg',
        cssVar: '--text-lg',
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'typography',
        cluster: 'scale',
        path: 'theme.typography.scale.xl',
        cssVar: '--text-xl',
        valueKind: 'dimension',
        payloadType: 'text',
    },

    // ── radii ───────────────────────────────────────────────────────────────
    {
        group: 'radii',
        cluster: 'radii',
        path: 'theme.radii.block',
        cssVar: '--block-border-radius',
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'radii',
        cluster: 'radii',
        path: 'theme.radii.blockLarge',
        cssVar: '--block-border-radius-large',
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'radii',
        cluster: 'radii',
        path: 'theme.radii.blockSmall',
        cssVar: '--block-border-radius-small',
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'radii',
        cluster: 'radii',
        path: 'theme.radii.blockTiny',
        cssVar: '--block-border-radius-tiny',
        valueKind: 'dimension',
        payloadType: 'text',
    },

    // ── spacing ─────────────────────────────────────────────────────────────
    {
        group: 'spacing',
        cluster: 'spacing',
        path: 'theme.spacing.blockPadding',
        cssVar: '--block-padding',
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'spacing',
        cluster: 'spacing',
        path: 'theme.spacing.blockSpacer',
        cssVar: '--block-spacer',
        valueKind: 'dimension',
        payloadType: 'text',
    },

    // ── elevation ───────────────────────────────────────────────────────────
    {
        group: 'elevation',
        cluster: 'elevation',
        path: 'theme.elevation.card',
        cssVar: '--product-card-shadow',
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'elevation',
        cluster: 'elevation',
        path: 'theme.elevation.cardHover',
        cssVar: '--product-card-shadow-hover',
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'elevation',
        cluster: 'elevation',
        path: 'theme.elevation.panel',
        cssVar: '--header-panel-shadow',
        valueKind: 'dimension',
        payloadType: 'text',
    },

    // ── productCard · chassis ─────────────────────────────────────────────────
    {
        group: 'productCard',
        cluster: 'chassis',
        path: 'theme.productCard.bg',
        cssVar: productCardCustomProperty('bg'),
        valueKind: 'color',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'chassis',
        path: 'theme.productCard.borderColor',
        cssVar: productCardCustomProperty('borderColor'),
        valueKind: 'color',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'chassis',
        path: 'theme.productCard.borderWidth',
        cssVar: productCardCustomProperty('borderWidth'),
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'chassis',
        path: 'theme.productCard.radius',
        cssVar: productCardCustomProperty('radius'),
        valueKind: 'dimension',
        payloadType: 'text',
        deprecated: true,
    },
    {
        group: 'productCard',
        cluster: 'chassis',
        path: 'theme.productCard.padding',
        cssVar: productCardCustomProperty('padding'),
        valueKind: 'dimension',
        payloadType: 'text',
        deprecated: true,
    },
    {
        group: 'productCard',
        cluster: 'chassis',
        path: 'theme.productCard.gap',
        cssVar: productCardCustomProperty('gap'),
        valueKind: 'dimension',
        payloadType: 'text',
        deprecated: true,
    },
    {
        group: 'productCard',
        cluster: 'chassis',
        path: 'theme.productCard.shadow',
        cssVar: productCardCustomProperty('shadow'),
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'chassis',
        path: 'theme.productCard.shadowHover',
        cssVar: productCardCustomProperty('shadowHover'),
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'chassis',
        path: 'theme.productCard.minWidth',
        cssVar: productCardCustomProperty('minWidth'),
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'chassis',
        path: 'theme.productCard.maxWidth',
        cssVar: productCardCustomProperty('maxWidth'),
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'chassis',
        path: 'theme.productCard.gridAlign',
        cssVar: productCardCustomProperty('gridAlign'),
        valueKind: 'enum',
        payloadType: 'select',
        enumValues: ['start', 'center', 'end', 'stretch'],
    },
    {
        group: 'productCard',
        cluster: 'chassis',
        path: 'theme.productCard.railEdgeStyle',
        cssVar: productCardCustomProperty('railEdgeStyle'),
        valueKind: 'enum',
        payloadType: 'select',
        enumValues: ['fade', 'none'],
    },
    {
        group: 'productCard',
        cluster: 'chassis',
        path: 'theme.productCard.searchImageWidth',
        cssVar: productCardCustomProperty('searchImageWidth'),
        valueKind: 'dimension',
        payloadType: 'text',
    },

    // ── productCard · image ───────────────────────────────────────────────────
    {
        group: 'productCard',
        cluster: 'image',
        path: 'theme.productCard.imageRadius',
        cssVar: productCardCustomProperty('imageRadius'),
        valueKind: 'dimension',
        payloadType: 'text',
        deprecated: true,
    },
    {
        group: 'productCard',
        cluster: 'image',
        path: 'theme.productCard.imagePadding',
        cssVar: productCardCustomProperty('imagePadding'),
        valueKind: 'dimension',
        payloadType: 'text',
        deprecated: true,
    },
    {
        group: 'productCard',
        cluster: 'image',
        path: 'theme.productCard.imageFit',
        cssVar: productCardCustomProperty('imageFit'),
        valueKind: 'enum',
        payloadType: 'select',
        enumValues: ['cover', 'contain'],
    },
    {
        group: 'productCard',
        cluster: 'image',
        path: 'theme.productCard.imageHoverSwap',
        cssVar: productCardCustomProperty('imageHoverSwap'),
        valueKind: 'enum',
        payloadType: 'select',
        enumValues: ['on', 'off'],
    },
    {
        group: 'productCard',
        cluster: 'image',
        path: 'theme.productCard.imageSizes',
        cssVar: productCardCustomProperty('imageSizes'),
        valueKind: 'dimension',
        payloadType: 'text',
        quoted: true,
    },
    {
        group: 'productCard',
        cluster: 'image',
        path: 'theme.productCard.aspectVertical',
        cssVar: productCardCustomProperty('aspectVertical'),
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'image',
        path: 'theme.productCard.aspectHorizontal',
        cssVar: productCardCustomProperty('aspectHorizontal'),
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'image',
        path: 'theme.productCard.aspectHorizontalSquare',
        cssVar: productCardCustomProperty('aspectHorizontalSquare'),
        valueKind: 'dimension',
        payloadType: 'text',
        deprecated: true,
    },
    {
        group: 'productCard',
        cluster: 'image',
        path: 'theme.productCard.aspectMicro',
        cssVar: productCardCustomProperty('aspectMicro'),
        valueKind: 'dimension',
        payloadType: 'text',
        deprecated: true,
    },

    // ── productCard · vendor ──────────────────────────────────────────────────
    {
        group: 'productCard',
        cluster: 'vendor',
        path: 'theme.productCard.vendorColor',
        cssVar: productCardCustomProperty('vendorColor'),
        valueKind: 'color',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'vendor',
        path: 'theme.productCard.vendorSize',
        cssVar: productCardCustomProperty('vendorSize'),
        valueKind: 'dimension',
        payloadType: 'text',
        deprecated: true,
    },
    {
        group: 'productCard',
        cluster: 'vendor',
        path: 'theme.productCard.eyebrowTracking',
        cssVar: productCardCustomProperty('eyebrowTracking'),
        valueKind: 'dimension',
        payloadType: 'text',
    },

    // ── productCard · title ───────────────────────────────────────────────────
    {
        group: 'productCard',
        cluster: 'title',
        path: 'theme.productCard.titleColor',
        cssVar: productCardCustomProperty('titleColor'),
        valueKind: 'color',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'title',
        path: 'theme.productCard.titleSize',
        cssVar: productCardCustomProperty('titleSize'),
        valueKind: 'dimension',
        payloadType: 'text',
        deprecated: true,
    },
    {
        group: 'productCard',
        cluster: 'title',
        path: 'theme.productCard.titleWeight',
        cssVar: productCardCustomProperty('titleWeight'),
        valueKind: 'number',
        payloadType: 'number',
        min: 100,
        max: 900,
        step: 100,
        deprecated: true,
    },
    {
        group: 'productCard',
        cluster: 'title',
        path: 'theme.productCard.titleLineClamp',
        cssVar: productCardCustomProperty('titleLineClamp'),
        valueKind: 'number',
        payloadType: 'number',
        min: 1,
        max: 6,
        step: 1,
    },

    // ── productCard · price ───────────────────────────────────────────────────
    {
        group: 'productCard',
        cluster: 'price',
        path: 'theme.productCard.priceColor',
        cssVar: productCardCustomProperty('priceColor'),
        valueKind: 'color',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'price',
        path: 'theme.productCard.priceSize',
        cssVar: productCardCustomProperty('priceSize'),
        valueKind: 'dimension',
        payloadType: 'text',
        deprecated: true,
    },
    {
        group: 'productCard',
        cluster: 'price',
        path: 'theme.productCard.priceWeight',
        cssVar: productCardCustomProperty('priceWeight'),
        valueKind: 'number',
        payloadType: 'number',
        min: 100,
        max: 900,
        step: 100,
        deprecated: true,
    },
    {
        group: 'productCard',
        cluster: 'price',
        path: 'theme.productCard.compareColor',
        cssVar: productCardCustomProperty('compareColor'),
        valueKind: 'color',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'price',
        path: 'theme.productCard.urgencyColor',
        cssVar: productCardCustomProperty('urgencyColor'),
        valueKind: 'color',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'price',
        path: 'theme.productCard.urgencyThreshold',
        cssVar: productCardCustomProperty('urgencyThreshold'),
        valueKind: 'number',
        payloadType: 'number',
        min: 0,
        step: 1,
    },

    // ── productCard · swatch ──────────────────────────────────────────────────
    {
        group: 'productCard',
        cluster: 'swatch',
        path: 'theme.productCard.swatchSize',
        cssVar: productCardCustomProperty('swatchSize'),
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'swatch',
        path: 'theme.productCard.swatchGap',
        cssVar: productCardCustomProperty('swatchGap'),
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'swatch',
        path: 'theme.productCard.swatchRingColor',
        cssVar: productCardCustomProperty('swatchRingColor'),
        valueKind: 'color',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'swatch',
        path: 'theme.productCard.swatchHitPadding',
        cssVar: productCardCustomProperty('swatchHitPadding'),
        valueKind: 'dimension',
        payloadType: 'text',
    },

    // ── productCard · chip ────────────────────────────────────────────────────
    {
        group: 'productCard',
        cluster: 'chip',
        path: 'theme.productCard.chipBg',
        cssVar: productCardCustomProperty('chipBg'),
        valueKind: 'color',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'chip',
        path: 'theme.productCard.chipColor',
        cssVar: productCardCustomProperty('chipColor'),
        valueKind: 'color',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'chip',
        path: 'theme.productCard.chipBorder',
        cssVar: productCardCustomProperty('chipBorder'),
        valueKind: 'color',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'chip',
        path: 'theme.productCard.chipActiveBg',
        cssVar: productCardCustomProperty('chipActiveBg'),
        valueKind: 'color',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'chip',
        path: 'theme.productCard.chipActiveColor',
        cssVar: productCardCustomProperty('chipActiveColor'),
        valueKind: 'color',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'chip',
        path: 'theme.productCard.chipPaddingY',
        cssVar: productCardCustomProperty('chipPaddingY'),
        valueKind: 'dimension',
        payloadType: 'text',
        deprecated: true,
    },
    {
        group: 'productCard',
        cluster: 'chip',
        path: 'theme.productCard.chipPaddingX',
        cssVar: productCardCustomProperty('chipPaddingX'),
        valueKind: 'dimension',
        payloadType: 'text',
        deprecated: true,
    },

    // ── productCard · more ────────────────────────────────────────────────────
    {
        group: 'productCard',
        cluster: 'more',
        path: 'theme.productCard.moreBg',
        cssVar: productCardCustomProperty('moreBg'),
        valueKind: 'color',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'more',
        path: 'theme.productCard.moreColor',
        cssVar: productCardCustomProperty('moreColor'),
        valueKind: 'color',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'more',
        path: 'theme.productCard.moreSize',
        cssVar: productCardCustomProperty('moreSize'),
        valueKind: 'dimension',
        payloadType: 'text',
        deprecated: true,
    },
    {
        group: 'productCard',
        cluster: 'more',
        path: 'theme.productCard.moreWeight',
        cssVar: productCardCustomProperty('moreWeight'),
        valueKind: 'number',
        payloadType: 'number',
        min: 100,
        max: 900,
        step: 100,
        deprecated: true,
    },
    {
        group: 'productCard',
        cluster: 'more',
        path: 'theme.productCard.moreMinSize',
        cssVar: productCardCustomProperty('moreMinSize'),
        valueKind: 'dimension',
        payloadType: 'text',
        deprecated: true,
    },

    // ── productCard · cta ─────────────────────────────────────────────────────
    {
        group: 'productCard',
        cluster: 'cta',
        path: 'theme.productCard.ctaBg',
        cssVar: productCardCustomProperty('ctaBg'),
        valueKind: 'color',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'cta',
        path: 'theme.productCard.ctaColor',
        cssVar: productCardCustomProperty('ctaColor'),
        valueKind: 'color',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'cta',
        path: 'theme.productCard.ctaRadius',
        cssVar: productCardCustomProperty('ctaRadius'),
        valueKind: 'dimension',
        payloadType: 'text',
        deprecated: true,
    },
    {
        group: 'productCard',
        cluster: 'cta',
        path: 'theme.productCard.ctaPaddingY',
        cssVar: productCardCustomProperty('ctaPaddingY'),
        valueKind: 'dimension',
        payloadType: 'text',
        deprecated: true,
    },
    {
        group: 'productCard',
        cluster: 'cta',
        path: 'theme.productCard.ctaHeight',
        cssVar: productCardCustomProperty('ctaHeight'),
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'cta',
        path: 'theme.productCard.ctaPlacement',
        cssVar: productCardCustomProperty('ctaPlacement'),
        valueKind: 'enum',
        payloadType: 'select',
        enumValues: ['float-pill', 'inline'],
    },
    {
        group: 'productCard',
        cluster: 'cta',
        path: 'theme.productCard.ctaPillPosition',
        cssVar: productCardCustomProperty('ctaPillPosition'),
        valueKind: 'enum',
        payloadType: 'select',
        enumValues: ['top-right', 'top-left', 'bottom-right', 'bottom-left'],
    },
    {
        group: 'productCard',
        cluster: 'cta',
        path: 'theme.productCard.ctaPillLabel',
        cssVar: productCardCustomProperty('ctaPillLabel'),
        valueKind: 'dimension',
        payloadType: 'text',
        quoted: true,
    },
    {
        group: 'productCard',
        cluster: 'cta',
        path: 'theme.productCard.ctaPillIcon',
        cssVar: productCardCustomProperty('ctaPillIcon'),
        valueKind: 'dimension',
        payloadType: 'text',
        quoted: true,
    },
    {
        group: 'productCard',
        cluster: 'cta',
        path: 'theme.productCard.ctaPillReveal',
        cssVar: productCardCustomProperty('ctaPillReveal'),
        valueKind: 'enum',
        payloadType: 'select',
        enumValues: ['always', 'hover'],
    },
    {
        group: 'productCard',
        cluster: 'cta',
        path: 'theme.productCard.ctaInlineStyle',
        cssVar: productCardCustomProperty('ctaInlineStyle'),
        valueKind: 'enum',
        payloadType: 'select',
        enumValues: ['solid', 'outline'],
    },
    {
        group: 'productCard',
        cluster: 'cta',
        path: 'theme.productCard.fastPathDot',
        cssVar: productCardCustomProperty('fastPathDot'),
        valueKind: 'color',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'cta',
        path: 'theme.productCard.fastPathSingleVariant',
        cssVar: productCardCustomProperty('fastPathSingleVariant'),
        valueKind: 'enum',
        payloadType: 'select',
        enumValues: ['on', 'off'],
    },
    {
        group: 'productCard',
        cluster: 'cta',
        path: 'theme.productCard.quickAddPresentation',
        cssVar: productCardCustomProperty('quickAddPresentation'),
        valueKind: 'enum',
        payloadType: 'select',
        enumValues: ['auto'],
    },

    // ── productCard · overlay (ALL LEGACY) ────────────────────────────────────
    {
        group: 'productCard',
        cluster: 'overlay',
        path: 'theme.productCard.overlayBg',
        cssVar: productCardCustomProperty('overlayBg'),
        valueKind: 'color',
        payloadType: 'text',
        deprecated: true,
    },
    {
        group: 'productCard',
        cluster: 'overlay',
        path: 'theme.productCard.overlayRadius',
        cssVar: productCardCustomProperty('overlayRadius'),
        valueKind: 'dimension',
        payloadType: 'text',
        deprecated: true,
    },
    {
        group: 'productCard',
        cluster: 'overlay',
        path: 'theme.productCard.overlayBorderColor',
        cssVar: productCardCustomProperty('overlayBorderColor'),
        valueKind: 'color',
        payloadType: 'text',
        deprecated: true,
    },
    {
        group: 'productCard',
        cluster: 'overlay',
        path: 'theme.productCard.overlayShadow',
        cssVar: productCardCustomProperty('overlayShadow'),
        valueKind: 'dimension',
        payloadType: 'text',
        deprecated: true,
    },
    {
        group: 'productCard',
        cluster: 'overlay',
        path: 'theme.productCard.overlayWidth',
        cssVar: productCardCustomProperty('overlayWidth'),
        valueKind: 'dimension',
        payloadType: 'text',
        deprecated: true,
    },
    {
        group: 'productCard',
        cluster: 'overlay',
        path: 'theme.productCard.overlayMaxHeight',
        cssVar: productCardCustomProperty('overlayMaxHeight'),
        valueKind: 'dimension',
        payloadType: 'text',
        deprecated: true,
    },
    {
        group: 'productCard',
        cluster: 'overlay',
        path: 'theme.productCard.overlayPadding',
        cssVar: productCardCustomProperty('overlayPadding'),
        valueKind: 'dimension',
        payloadType: 'text',
        deprecated: true,
    },

    // ── productCard · oos ─────────────────────────────────────────────────────
    {
        group: 'productCard',
        cluster: 'oos',
        path: 'theme.productCard.oosOpacity',
        cssVar: productCardCustomProperty('oosOpacity'),
        valueKind: 'number',
        payloadType: 'number',
        min: 0,
        max: 1,
        step: 0.05,
    },
    {
        group: 'productCard',
        cluster: 'oos',
        path: 'theme.productCard.oosImageSaturate',
        cssVar: productCardCustomProperty('oosImageSaturate'),
        valueKind: 'number',
        payloadType: 'number',
        min: 0,
        max: 1,
        step: 0.05,
    },

    // ── productCard · motion ──────────────────────────────────────────────────
    {
        group: 'productCard',
        cluster: 'motion',
        path: 'theme.productCard.motionEase',
        cssVar: productCardCustomProperty('motionEase'),
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'motion',
        path: 'theme.productCard.motionFast',
        cssVar: productCardCustomProperty('motionFast'),
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'motion',
        path: 'theme.productCard.motionBase',
        cssVar: productCardCustomProperty('motionBase'),
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'motion',
        path: 'theme.productCard.motionPickerIn',
        cssVar: productCardCustomProperty('motionPickerIn'),
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'motion',
        path: 'theme.productCard.motionPickerOut',
        cssVar: productCardCustomProperty('motionPickerOut'),
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'motion',
        path: 'theme.productCard.motionHoverDuration',
        cssVar: productCardCustomProperty('motionHoverDuration'),
        valueKind: 'dimension',
        payloadType: 'text',
        deprecated: true,
    },
    {
        group: 'productCard',
        cluster: 'motion',
        path: 'theme.productCard.motionHoverEase',
        cssVar: productCardCustomProperty('motionHoverEase'),
        valueKind: 'dimension',
        payloadType: 'text',
        deprecated: true,
    },
    {
        group: 'productCard',
        cluster: 'motion',
        path: 'theme.productCard.motionImageSwapDuration',
        cssVar: productCardCustomProperty('motionImageSwapDuration'),
        valueKind: 'dimension',
        payloadType: 'text',
        deprecated: true,
    },
    {
        group: 'productCard',
        cluster: 'motion',
        path: 'theme.productCard.motionOverlayInDuration',
        cssVar: productCardCustomProperty('motionOverlayInDuration'),
        valueKind: 'dimension',
        payloadType: 'text',
        deprecated: true,
    },
    {
        group: 'productCard',
        cluster: 'motion',
        path: 'theme.productCard.motionOverlayInEase',
        cssVar: productCardCustomProperty('motionOverlayInEase'),
        valueKind: 'dimension',
        payloadType: 'text',
        deprecated: true,
    },

    // ── productCard · sale ────────────────────────────────────────────────────
    {
        group: 'productCard',
        cluster: 'sale',
        path: 'theme.productCard.saleStyle',
        cssVar: productCardCustomProperty('saleStyle'),
        valueKind: 'enum',
        payloadType: 'select',
        enumValues: ['strike-only'],
    },
    {
        group: 'productCard',
        cluster: 'sale',
        path: 'theme.productCard.saleStrikeColor',
        cssVar: productCardCustomProperty('saleStrikeColor'),
        valueKind: 'color',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'sale',
        path: 'theme.productCard.saleStrikeAngle',
        cssVar: productCardCustomProperty('saleStrikeAngle'),
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'sale',
        path: 'theme.productCard.saleStrikeExtend',
        cssVar: productCardCustomProperty('saleStrikeExtend'),
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'sale',
        path: 'theme.productCard.saleCurrentColor',
        cssVar: productCardCustomProperty('saleCurrentColor'),
        valueKind: 'color',
        payloadType: 'text',
    },
    {
        group: 'productCard',
        cluster: 'sale',
        path: 'theme.productCard.saleShowSavingsLine',
        cssVar: productCardCustomProperty('saleShowSavingsLine'),
        valueKind: 'enum',
        payloadType: 'select',
        enumValues: ['on', 'off'],
    },
    {
        group: 'productCard',
        cluster: 'sale',
        path: 'theme.productCard.saleBadgeStyle',
        cssVar: productCardCustomProperty('saleBadgeStyle'),
        valueKind: 'enum',
        payloadType: 'select',
        enumValues: ['default'],
    },
    {
        group: 'productCard',
        cluster: 'sale',
        path: 'theme.productCard.saleBadgePosition',
        cssVar: productCardCustomProperty('saleBadgePosition'),
        valueKind: 'enum',
        payloadType: 'select',
        enumValues: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    },
    {
        group: 'productCard',
        cluster: 'sale',
        path: 'theme.productCard.saleBadgeText',
        cssVar: productCardCustomProperty('saleBadgeText'),
        valueKind: 'dimension',
        payloadType: 'text',
        quoted: true,
    },
    {
        group: 'productCard',
        cluster: 'sale',
        path: 'theme.productCard.saleBadgeMinDiscount',
        cssVar: productCardCustomProperty('saleBadgeMinDiscount'),
        valueKind: 'number',
        payloadType: 'number',
        min: 0,
        max: 100,
        step: 1,
    },
    {
        group: 'productCard',
        cluster: 'sale',
        path: 'theme.productCard.saleBadgeAllowOverlap',
        cssVar: productCardCustomProperty('saleBadgeAllowOverlap'),
        valueKind: 'boolean',
        payloadType: 'checkbox',
    },

    // ── cartLine ────────────────────────────────────────────────────────────
    {
        group: 'cartLine',
        cluster: 'line',
        path: 'theme.cartLine.imageSize',
        cssVar: cartLineCustomProperty('imageSize'),
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'cartLine',
        cluster: 'line',
        path: 'theme.cartLine.imageRadius',
        cssVar: cartLineCustomProperty('imageRadius'),
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'cartLine',
        cluster: 'line',
        path: 'theme.cartLine.gap',
        cssVar: cartLineCustomProperty('gap'),
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'cartLine',
        cluster: 'line',
        path: 'theme.cartLine.paddingY',
        cssVar: cartLineCustomProperty('paddingY'),
        valueKind: 'dimension',
        payloadType: 'text',
    },
    {
        group: 'cartLine',
        cluster: 'line',
        path: 'theme.cartLine.dividerColor',
        cssVar: cartLineCustomProperty('dividerColor'),
        valueKind: 'color',
        payloadType: 'text',
    },
] as const satisfies readonly ThemeTokenMeta[];

// Compile-time guard: every catalog `path` must address a real `ResolvedShopTheme` node. Any drift
// (typo, renamed field) makes the offending path fail to extend `ThemeTokenPath` and breaks the build.
type _CatalogPath = (typeof THEME_TOKEN_CATALOG)[number]['path'];
type _InvalidPaths = Exclude<_CatalogPath, ThemeTokenPath>;
const _pathsAreValid: _InvalidPaths extends never ? true : ['invalid theme path(s)', _InvalidPaths] = true;
void _pathsAreValid;

/**
 * Buckets {@link THEME_TOKEN_CATALOG} into `group → cluster → tokens`, preserving declaration order
 * at every level so the admin left-rail and cluster accordions render deterministically without
 * naming any token in a component.
 *
 * @returns A nested map keyed by {@link ThemeGroup} then cluster, each leaf an ordered token list.
 */
export const deriveCatalog = (): Map<ThemeGroup, Map<string, ThemeTokenMeta[]>> => {
    const groups = new Map<ThemeGroup, Map<string, ThemeTokenMeta[]>>();

    for (const token of THEME_TOKEN_CATALOG) {
        let clusters = groups.get(token.group);
        if (!clusters) {
            clusters = new Map<string, ThemeTokenMeta[]>();
            groups.set(token.group, clusters);
        }

        let tokens = clusters.get(token.cluster);
        if (!tokens) {
            tokens = [];
            clusters.set(token.cluster, tokens);
        }

        tokens.push(token);
    }

    return groups;
};
