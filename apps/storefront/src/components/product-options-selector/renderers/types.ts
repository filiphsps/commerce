import type { ProductVariant } from '@/api/product';

export type RenderDensity = 'spacious' | 'compact';

export type ProductOptionValueRendererProps = {
    name: string;
    value: string;
    selected: boolean;
    available: boolean;
    exists: boolean;
    isDifferentProduct: boolean;
    variant: ProductVariant;
    href?: string;
    onSelect: () => void;
    density: RenderDensity;
};
