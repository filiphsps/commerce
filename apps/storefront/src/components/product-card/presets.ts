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
        ctaPlacement: 'float-pill',
        pickerPresentation: 'auto',
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
