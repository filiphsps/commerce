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
 * Precedence (highest first): per-shop/CMS `override` → the {@link SURFACE_PRESETS} entry for the
 * surface → {@link BUILTIN_PRODUCT_CARD_SURFACE}. A shop with no override resolves byte-identically
 * to the current preset, so un-customized tenants are unchanged; overrides layer on field-by-field
 * rather than replacing the preset (an absent or `undefined` field defers to the preset).
 *
 * @param surface - Surface key (e.g. `collection`, `search`, `recommendation`).
 * @param override - Optional per-shop/CMS fields that take precedence over the preset.
 * @returns The fully-resolved surface configuration with every field populated.
 */
export function resolveProductCardSurface(
    surface: string,
    override?: ProductCardSurfaceOverride,
): ProductCardSurfacePreset {
    const preset: ProductCardSurfacePreset =
        (SURFACE_PRESETS as Record<string, ProductCardSurfacePreset>)[surface] ?? BUILTIN_PRODUCT_CARD_SURFACE;

    return {
        layout: override?.layout ?? preset.layout,
        chrome: override?.chrome ?? preset.chrome,
        ctaPlacement: override?.ctaPlacement ?? preset.ctaPlacement,
        pickerPresentation: override?.pickerPresentation ?? preset.pickerPresentation,
    };
}
