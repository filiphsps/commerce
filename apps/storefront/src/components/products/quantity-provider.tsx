'use client';

import { MissingContextProviderError } from '@nordcom/commerce-errors';
import type { ReactNode } from 'react';
import { createContext, useContext, useMemo } from 'react';

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

/**
 * Provides quantity state to the product-page subtree via context.
 *
 * @param props.quantity - Current quantity value.
 * @param props.setQuantity - Setter forwarded to consumers via context.
 * @param props.children - Subtree that consumes the quantity context.
 * @returns The context provider wrapping `children`.
 */
export function QuantityProvider({ children, quantity, setQuantity }: ShopProviderProps) {
    const value = useMemo(() => ({ quantity, setQuantity }), [quantity, setQuantity]);

    return <QuantityContext.Provider value={value}>{children}</QuantityContext.Provider>;
}
QuantityProvider.displayName = 'Nordcom.QuantityProvider';

/**
 * Returns the quantity context value from the nearest `QuantityProvider`.
 *
 * @returns The current `QuantityContextValue`.
 * @throws {MissingContextProviderError} When called outside a `QuantityProvider`.
 */
export const useQuantity = (): QuantityContextValue => {
    const context = useContext(QuantityContext);
    if (!context) {
        throw new MissingContextProviderError('useQuantity', 'QuantityProvider');
    }

    return context;
};
