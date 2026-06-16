import 'server-only';

export type ProductCardLayout = 'vertical' | 'horizontal';
export type ProductCardChrome = 'boxed' | 'frameless';
export type ProductCardCtaPlacement = string;
export type ProductCardPickerPresentation = 'auto' | 'float' | 'sheet' | 'inline';

export type ProductCardSurfacePreset = {
    layout: ProductCardLayout;
    chrome: ProductCardChrome;
    ctaPlacement: ProductCardCtaPlacement;
    pickerPresentation: ProductCardPickerPresentation;
};

export const SURFACE_PRESETS = {
    collection: {
        layout: 'vertical',
        chrome: 'boxed',
        ctaPlacement: 'inline-button',
        pickerPresentation: 'inline',
    },
    recommendation: {
        layout: 'vertical',
        chrome: 'boxed',
        ctaPlacement: 'float-pill',
        pickerPresentation: 'auto',
    },
    search: {
        layout: 'horizontal',
        chrome: 'boxed',
        ctaPlacement: 'float-pill',
        pickerPresentation: 'auto',
    },
} as const satisfies Record<string, ProductCardSurfacePreset>;

/**
 * Built-in default surface configuration — the lowest-precedence fallback layer, applied only
 * when a surface key matches no {@link SURFACE_PRESETS} entry. Mirrors the `collection` preset so
 * an unmapped surface degrades to the safe vertical/boxed card with the `float-pill` CTA.
 */
export const BUILTIN_PRODUCT_CARD_SURFACE: ProductCardSurfacePreset = {
    layout: 'vertical',
    chrome: 'boxed',
    ctaPlacement: 'float-pill',
    pickerPresentation: 'auto',
};

/**
 * Per-shop / CMS surface override (P3-1 / P3-4). Every field is optional; only the provided
 * fields layer on top of the resolved surface preset, leaving the rest at their preset value.
 */
export type ProductCardSurfaceOverride = Partial<ProductCardSurfacePreset>;

/**
 * Resolves the effective product-card surface configuration for a tenant.
 *
 * Precedence per field (highest first): per-surface store `override` → the store-wide `base` (applies
 * across every surface) → the {@link SURFACE_PRESETS} entry for the surface → {@link
 * BUILTIN_PRODUCT_CARD_SURFACE}. A shop with neither override nor base resolves byte-identically to
 * the current preset, so un-customized tenants are unchanged; both layers apply field-by-field (an
 * absent or `undefined` field defers to the next tier down). A store-wide `base` value deliberately
 * overrides the platform surface preset — "change every card at once" reaches all surfaces — while a
 * per-surface `override` carves out the exception. See `docs/adr/0004`.
 *
 * @param surface - Surface key (e.g. `collection`, `search`, `recommendation`).
 * @param override - Optional per-surface store fields, highest precedence below per-instance.
 * @param base - Optional store-wide fields applied across every surface, below the per-surface override.
 * @returns The fully-resolved surface configuration with every field populated.
 */
export function resolveProductCardSurface(
    surface: string,
    override?: ProductCardSurfaceOverride,
    base?: ProductCardSurfaceOverride,
): ProductCardSurfacePreset {
    const preset: ProductCardSurfacePreset =
        (SURFACE_PRESETS as Record<string, ProductCardSurfacePreset>)[surface] ?? BUILTIN_PRODUCT_CARD_SURFACE;

    return {
        layout: override?.layout ?? base?.layout ?? preset.layout,
        chrome: override?.chrome ?? base?.chrome ?? preset.chrome,
        ctaPlacement: override?.ctaPlacement ?? base?.ctaPlacement ?? preset.ctaPlacement,
        pickerPresentation: override?.pickerPresentation ?? base?.pickerPresentation ?? preset.pickerPresentation,
    };
}
