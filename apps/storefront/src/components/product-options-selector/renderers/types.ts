import type { ProductVariant } from '@/api/product';

export type RenderDensity = 'spacious' | 'compact';

export type OptionValueSwatch = {
    color?: string | null;
    image?: {
        previewImage?: {
            url?: string | null;
            altText?: string | null;
            width?: number | null;
            height?: number | null;
        } | null;
    } | null;
} | null;

export type ProductOptionValueRendererProps = {
    name: string;
    value: string;
    selected: boolean;
    available: boolean;
    exists: boolean;
    isDifferentProduct: boolean;
    variant: ProductVariant;
    swatch?: OptionValueSwatch;
    href?: string;
    onSelect: () => void;
    density: RenderDensity;
};
