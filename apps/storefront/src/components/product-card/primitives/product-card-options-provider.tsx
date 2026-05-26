// apps/storefront/src/components/product-card/primitives/product-card-options-provider.tsx
'use client';

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import type { Product } from '@/api/product';

type VariantSelectionValue = {
    product: Product;
    selectedVariantId: string;
    selectVariant: (variantId: string) => void;
};

type PickerOpenValue = {
    isSingleBuyable: boolean;
    open: boolean;
    setOpen: (open: boolean) => void;
};

const VariantSelectionContext = createContext<VariantSelectionValue | null>(null);
const PickerOpenContext = createContext<PickerOpenValue | null>(null);

export type ProductCardOptionsProviderProps = {
    product: Product;
    seedVariantId: string;
    isSingleBuyable: boolean;
    children: ReactNode;
};

export function ProductCardOptionsProvider({
    product,
    seedVariantId,
    isSingleBuyable,
    children,
}: ProductCardOptionsProviderProps) {
    const [selectedVariantId, setSelectedVariantId] = useState(seedVariantId);
    const [open, setOpen] = useState(false);

    const selectVariant = useCallback((next: string) => setSelectedVariantId(next), []);

    const selectionValue = useMemo<VariantSelectionValue>(
        () => ({ product, selectedVariantId, selectVariant }),
        [product, selectedVariantId, selectVariant],
    );

    const pickerValue = useMemo<PickerOpenValue>(() => ({ isSingleBuyable, open, setOpen }), [isSingleBuyable, open]);

    return (
        <VariantSelectionContext.Provider value={selectionValue}>
            <PickerOpenContext.Provider value={pickerValue}>{children}</PickerOpenContext.Provider>
        </VariantSelectionContext.Provider>
    );
}

export const useVariantSelection = () => useContext(VariantSelectionContext);
export const usePickerOpen = () => useContext(PickerOpenContext);
