'use client';
import { createContext, useContext } from 'react';
import type { ProductOptionsContextValue } from './types';

export const ProductOptionsContext = createContext<ProductOptionsContextValue | null>(null);

export function useProductOptions(): ProductOptionsContextValue {
    const ctx = useContext(ProductOptionsContext);
    if (!ctx) throw new Error('useProductOptions must be used inside <ProductOptions.Root>');
    return ctx;
}

export function useMaybeProductOptions(): ProductOptionsContextValue | null {
    return useContext(ProductOptionsContext);
}
