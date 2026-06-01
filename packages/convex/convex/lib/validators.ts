import { type GenericValidator, type Infer, type Validator, v } from 'convex/values';

/**
 * Brand-accent swatch validator, mirroring `AccentToken` from
 * `@nordcom/commerce-db`'s `lib/theme.ts`: a `primary`/`secondary` discriminator plus a `color`
 * and its `foreground`. Shared by the required `design.accents` source and the optional
 * `theme.colors.accents` override, so both surfaces stay structurally identical.
 */
export const accentTokenValidator = v.object({
    type: v.union(v.literal('primary'), v.literal('secondary')),
    color: v.string(),
    foreground: v.string(),
});

/**
 * Color group of {@link resolvedShopThemeValidator}, mirroring `ResolvedShopTheme['colors']`. The
 * four `accent*Light`/`accent*Dark` shades are OPTIONAL and absent by default because the storefront
 * derives them from the base accent at request time; a value here is an explicit override of that
 * derivation rather than a stored default.
 */
export const themeColorsValidator = v.object({
    background: v.string(),
    foreground: v.string(),
    accents: v.array(accentTokenValidator),
    accentPrimaryLight: v.optional(v.string()),
    accentPrimaryDark: v.optional(v.string()),
    accentSecondaryLight: v.optional(v.string()),
    accentSecondaryDark: v.optional(v.string()),
    surface: v.object({ base: v.string(), raised: v.string(), sunken: v.string() }),
    text: v.object({ default: v.string(), muted: v.string() }),
    border: v.object({ default: v.string(), strong: v.string() }),
    state: v.object({ sale: v.string(), danger: v.string(), success: v.string(), info: v.string() }),
    focusRing: v.string(),
});

/**
 * Typography group of {@link resolvedShopThemeValidator}, mirroring `ResolvedShopTheme['typography']`.
 * `fontFamily`/`headingFamily` are stored as free strings (a `FONT_FAMILIES` allowlist key after
 * `resolveTheme` narrows them); weights are numeric and the type scale is a string ramp.
 */
export const themeTypographyValidator = v.object({
    fontFamily: v.string(),
    headingFamily: v.string(),
    fontWeights: v.object({
        normal: v.number(),
        medium: v.number(),
        semibold: v.number(),
        bold: v.number(),
    }),
    scale: v.object({
        xs: v.string(),
        sm: v.string(),
        base: v.string(),
        lg: v.string(),
        xl: v.string(),
    }),
});

/**
 * Flat product-card token map, mirroring `ResolvedProductCardTokens` from `lib/theme.ts`. Most knobs
 * are CSS strings; the unitless knobs (`titleWeight`, `titleLineClamp`, `priceWeight`,
 * `urgencyThreshold`, `moreWeight`, `oosOpacity`, `oosImageSaturate`, `saleBadgeMinDiscount`) are
 * numeric and `saleBadgeAllowOverlap` is boolean, matching the source so a value never mis-serializes.
 */
export const productCardTokensValidator = v.object({
    // Chassis
    bg: v.string(),
    borderColor: v.string(),
    borderWidth: v.string(),
    radius: v.string(),
    padding: v.string(),
    gap: v.string(),
    shadow: v.string(),
    shadowHover: v.string(),
    minWidth: v.string(),
    maxWidth: v.string(),
    gridAlign: v.string(),
    searchImageWidth: v.string(),

    // Image
    imageRadius: v.string(),
    imagePadding: v.string(),
    imageFit: v.string(),
    imageHoverSwap: v.string(),
    imageSizes: v.string(),
    aspectVertical: v.string(),
    aspectHorizontal: v.string(),
    aspectHorizontalSquare: v.string(),
    aspectMicro: v.string(),

    // Typography
    vendorColor: v.string(),
    vendorSize: v.string(),
    titleColor: v.string(),
    titleSize: v.string(),
    titleWeight: v.number(),
    titleLineClamp: v.number(),
    priceColor: v.string(),
    priceSize: v.string(),
    priceWeight: v.number(),
    compareColor: v.string(),
    urgencyColor: v.string(),
    urgencyThreshold: v.number(),
    eyebrowTracking: v.string(),

    // Swatch
    swatchSize: v.string(),
    swatchGap: v.string(),
    swatchRingColor: v.string(),
    swatchHitPadding: v.string(),

    // Chip + More
    chipBg: v.string(),
    chipColor: v.string(),
    chipBorder: v.string(),
    chipActiveBg: v.string(),
    chipActiveColor: v.string(),
    chipPaddingY: v.string(),
    chipPaddingX: v.string(),
    moreBg: v.string(),
    moreColor: v.string(),
    moreSize: v.string(),
    moreWeight: v.number(),
    moreMinSize: v.string(),

    // CTA / quick-add
    ctaBg: v.string(),
    ctaColor: v.string(),
    ctaRadius: v.string(),
    ctaPaddingY: v.string(),
    ctaHeight: v.string(),
    ctaPlacement: v.string(),
    ctaPillPosition: v.string(),
    ctaPillLabel: v.string(),
    ctaPillIcon: v.string(),
    ctaPillReveal: v.string(),
    ctaInlineStyle: v.string(),
    fastPathDot: v.string(),
    fastPathSingleVariant: v.string(),
    quickAddPresentation: v.string(),

    // Overlay
    overlayBg: v.string(),
    overlayRadius: v.string(),
    overlayBorderColor: v.string(),
    overlayShadow: v.string(),
    overlayWidth: v.string(),
    overlayMaxHeight: v.string(),
    overlayPadding: v.string(),

    // Out-of-stock
    oosOpacity: v.number(),
    oosImageSaturate: v.number(),

    // Motion
    motionEase: v.string(),
    motionFast: v.string(),
    motionBase: v.string(),
    motionPickerIn: v.string(),
    motionPickerOut: v.string(),
    motionHoverDuration: v.string(),
    motionHoverEase: v.string(),
    motionImageSwapDuration: v.string(),
    motionOverlayInDuration: v.string(),
    motionOverlayInEase: v.string(),

    // Sale / badge
    saleStyle: v.string(),
    saleStrikeColor: v.string(),
    saleStrikeAngle: v.string(),
    saleStrikeExtend: v.string(),
    saleCurrentColor: v.string(),
    saleShowSavingsLine: v.string(),
    saleBadgeStyle: v.string(),
    saleBadgePosition: v.string(),
    saleBadgeText: v.string(),
    saleBadgeMinDiscount: v.number(),
    saleBadgeAllowOverlap: v.boolean(),
});

/**
 * Fully-populated, platform-defaulted theme token map for a single shop, mirroring `ResolvedShopTheme`
 * from `@nordcom/commerce-db`'s `lib/theme.ts` (whose leaf metadata is catalogued in
 * `lib/theme-catalog.ts`) EXACTLY — every group, field, optionality, and value kind. This is the
 * canonical stored shape every downstream table that persists a resolved theme reuses, so a drift here
 * would break theme serialization platform-wide. Object validation rejects unknown keys, so a stale or
 * hand-edited record carrying a token the storefront cannot consume fails closed.
 */
export const resolvedShopThemeValidator = v.object({
    colors: themeColorsValidator,
    typography: themeTypographyValidator,
    radii: v.object({
        block: v.string(),
        blockLarge: v.string(),
        blockSmall: v.string(),
        blockTiny: v.string(),
    }),
    spacing: v.object({ blockPadding: v.string(), blockSpacer: v.string() }),
    elevation: v.object({ card: v.string(), cardHover: v.string(), panel: v.string() }),
    productCard: productCardTokensValidator,
});

/**
 * Recursive partial mirroring `DeepPartial` from `@nordcom/commerce-db`'s `lib/theme.ts` — the helper
 * that derives the authored `ShopThemeTokens` from `ResolvedShopTheme`. Every object leaf becomes
 * optional at every depth; arrays STOP the recursion and keep fully-required elements (a shop sets a
 * whole accent swatch or none). Kept byte-identical to that source `DeepPartial` so the authored-theme
 * contract cannot drift from the resolved one.
 */
type DeepPartial<T> =
    T extends ReadonlyArray<infer U> ? U[] : T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

/**
 * Derives a deep-partial validator from an object validator: every field, at every object depth, is
 * made optional, while array validators are returned untouched so their elements stay fully required —
 * mirroring {@link DeepPartial}'s array-stops-recursion rule. Used to express
 * `ShopThemeTokens = DeepPartial<ResolvedShopTheme>` from {@link resolvedShopThemeValidator} WITHOUT
 * re-declaring the ~200-token tree, so the authored-override shape and the resolved shape share one
 * source of truth and cannot drift apart.
 *
 * @param validator - Source validator; object validators are rebuilt field-by-field, every other kind
 *   (string, number, array, union, …) is returned as-is.
 * @returns A validator accepting any subset of the source object's tokens at any depth.
 */
const deepPartialValidator = (validator: GenericValidator): GenericValidator => {
    if (validator.kind !== 'object') return validator;
    const fields: Record<string, GenericValidator> = {};
    for (const [key, field] of Object.entries(validator.fields)) {
        fields[key] = v.optional(deepPartialValidator(field));
    }
    return v.object(fields);
};

/**
 * Authored per-tenant theme token overrides, mirroring `ShopThemeTokens`
 * (`DeepPartial<ResolvedShopTheme>`) from `@nordcom/commerce-db`'s `lib/theme.ts`. A shop may set any
 * subset of tokens at any depth; absent tokens resolve to the platform defaults via `resolveTheme`, so
 * an unset theme renders byte-identically to today. This is the optional `shops.theme` shape.
 */
export type ShopThemeTokens = DeepPartial<Infer<typeof resolvedShopThemeValidator>>;

/**
 * Runtime validator for {@link ShopThemeTokens}, DERIVED from {@link resolvedShopThemeValidator} via
 * {@link deepPartialValidator} so the authored-override shape tracks the resolved shape exactly. Object
 * validation still rejects unknown keys, so a stale or hand-edited token the storefront cannot consume
 * fails closed.
 */
export const shopThemeTokensValidator = deepPartialValidator(resolvedShopThemeValidator) as Validator<
    ShopThemeTokens,
    'required',
    string
>;

/**
 * JSON-serializable value mirroring `JsonValue` from `@nordcom/commerce-db`'s feature-flag model
 * (`packages/db/src/models/feature-flag.ts`) — the `Mixed`-typed payload a feature flag stores as its
 * `defaultValue`, targeting-rule output, and option value:
 * `string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }`.
 *
 * This alias is RE-DECLARED rather than imported: the convex package must not depend on the
 * Mongoose-/`server-only`-bound db package. There is therefore no compiler link to the source, so this
 * definition MUST be kept byte-identical to that `JsonValue`; update both together if either changes.
 *
 * Convex builds validators eagerly, so a validator cannot reference itself; the recursive arms below
 * therefore admit their nested values with `v.any()`. The top-level union still rejects `undefined`
 * (which is not JSON-representable and never the result of `resolveTheme`/flag resolution), matching the
 * `JsonValue` type's exclusion of `undefined` while accepting arbitrarily-nested objects and arrays.
 */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/**
 * Runtime validator for {@link JsonValue}. See the type's note on why the recursive arms use `v.any()`
 * for their nested values.
 */
export const jsonValueValidator: Validator<JsonValue, 'required', string> = v.union(
    v.null(),
    v.boolean(),
    v.number(),
    v.string(),
    v.array(v.any()),
    v.record(v.string(), v.any()),
) as Validator<JsonValue, 'required', string>;

/**
 * One selectable option in a feature flag's `options` list, mirroring `FeatureFlagOption` from the
 * feature-flag model: a human-readable `label` paired with a JSON-safe `value`.
 */
export const featureFlagOptionValidator = v.object({
    label: v.string(),
    value: jsonValueValidator,
});

/**
 * One rule in a feature flag's targeting configuration, mirroring `TargetingRule` from the feature-flag
 * model: `rule` names the registered evaluator, `params` supplies its JSON-safe inputs, `value` is the
 * override returned on a match, and the optional `description` documents the rule. `params` and `value`
 * are stored as Mongo `Mixed`, represented here by {@link jsonValueValidator}.
 */
export const targetingRuleValidator = v.object({
    rule: v.string(),
    params: v.record(v.string(), jsonValueValidator),
    value: jsonValueValidator,
    description: v.optional(v.string()),
});
