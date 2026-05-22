'use client';

import { createContext, useContext } from 'react';
import type { Product, ProductVariant } from '@/api/product';
import type { Locale, LocaleDictionary } from '@/utils/locale';

export type ProductCardVariant = 'vertical-boxed' | 'vertical-bare' | 'horizontal-boxed' | 'horizontal-bare' | 'micro';

export const ALL_VARIANTS: ReadonlyArray<ProductCardVariant> = [
    'vertical-boxed',
    'vertical-bare',
    'horizontal-boxed',
    'horizontal-bare',
    'micro',
] as const;

export const DEFAULT_VARIANT: ProductCardVariant = 'vertical-boxed';

export type ProductCardContextValue = {
    variant: ProductCardVariant;
    data: Product;
    selected: ProductVariant | undefined;
    setSelected: (updater: (prev: ProductVariant | undefined) => ProductVariant) => void;
    hoveredImage: ProductVariant['image'] | undefined;
    setHoveredImage: (image: ProductVariant['image'] | undefined) => void;
    i18n: LocaleDictionary;
    locale: Locale;
    priority: boolean;
};

const ProductCardContext = createContext<ProductCardContextValue | null>(null);

export const ProductCardContextProvider = ProductCardContext.Provider;

export function useProductCardContext(): ProductCardContextValue {
    const ctx = useContext(ProductCardContext);
    if (!ctx) {
        throw new Error('useProductCardContext must be used within a <ProductCard.Root>');
    }
    return ctx;
}

export function resolveVariant(input: string | undefined): ProductCardVariant {
    if (input && (ALL_VARIANTS as ReadonlyArray<string>).includes(input)) {
        return input as ProductCardVariant;
    }
    return DEFAULT_VARIANT;
}
