import type { ProductVariant } from '@/api/product';

export type Selection = Record<string, string>;

export type ResolvedSwatch = {
    color?: string;
    image?: { url: string; altText?: string | null; width?: number; height?: number };
};

export type ResolvedOptionValue = {
    name: string;
    selected: boolean;
    available: boolean;
    swatch?: ResolvedSwatch;
    variant?: ProductVariant;
};

export type ResolvedOption = {
    name: string;
    values: ResolvedOptionValue[];
};

export type OptionValueRendererProps = {
    group: ResolvedOption;
    value: ResolvedOptionValue;
    onSelect: () => void;
    density: 'compact' | 'spacious';
};

export type OptionValueRenderer = React.ComponentType<OptionValueRendererProps>;

export type ProductOptionsContextValue = {
    product: import('@/api/product').Product;
    resolved: ResolvedOption[];
    selection: Selection;
    selectVariant: (next: Selection) => void;
    selectedVariant: ProductVariant | undefined;
    hoveredVariant: ProductVariant | undefined;
    setHoveredVariant: (v: ProductVariant | undefined) => void;
    renderers: Record<string, OptionValueRenderer>;
};
