'use client';
import { createContext, useContext } from 'react';
import type { ProductOptionsContextValue } from './types';

export const ProductOptionsContext = createContext<ProductOptionsContextValue | null>(null);

/**
 * Returns the product-options context value, throwing when called outside a `ProductOptions.Root`.
 *
 * @returns The current `ProductOptionsContextValue`.
 * @throws When used outside a `ProductOptions.Root` provider.
 */
export function useProductOptions(): ProductOptionsContextValue {
    const ctx = useContext(ProductOptionsContext);
    if (!ctx) throw new Error('useProductOptions must be used inside <ProductOptions.Root>');
    return ctx;
}

/**
 * Returns the product-options context value, or `null` when called outside a `ProductOptions.Root`.
 *
 * @returns The current `ProductOptionsContextValue`, or `null` when no provider is present.
 */
export function useMaybeProductOptions(): ProductOptionsContextValue | null {
    return useContext(ProductOptionsContext);
}
