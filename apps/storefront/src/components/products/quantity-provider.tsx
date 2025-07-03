'use client';

import { createContext, useContext, useMemo } from 'react';

import { MissingContextProviderError } from '@nordcom/commerce-errors';

import type { ReactNode } from 'react';

type QuantityContextReturns = {};

export interface QuantityProviderBase {
    quantity: number;
    setQuantity: (value: number) => void;
}
export interface ShopProviderProps extends QuantityProviderBase {
    children: ReactNode;
}

export interface QuantityContextValue extends QuantityProviderBase, QuantityContextReturns {}

export const QuantityContext = createContext<QuantityContextValue | null>(null);

export function QuantityProvider({ children, quantity, setQuantity }: ShopProviderProps) {
    const value = useMemo(() => ({ quantity, setQuantity }), [quantity, setQuantity]);

    return <QuantityContext.Provider value={value}>{children as any}</QuantityContext.Provider>;
}
QuantityProvider.displayName = 'Nordcom.QuantityProvider';

export const useQuantity = (): QuantityContextValue => {
    const context = useContext(QuantityContext);
    if (!context) {
        throw new MissingContextProviderError('useQuantity', 'QuantityProvider');
    }

    return context;
};
