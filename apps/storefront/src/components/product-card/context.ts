'use client';

import { createContext, useContext } from 'react';
import type { Product, ProductVariant } from '@/api/product';
import type { ProductCardVariant } from '@/components/product-card/variant';
import type { Locale, LocaleDictionary } from '@/utils/locale';

export type { ProductCardVariant } from '@/components/product-card/variant';
export { ALL_VARIANTS, DEFAULT_VARIANT, resolveVariant } from '@/components/product-card/variant';

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
