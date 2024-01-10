'use client';

import { Locale } from '@/utils/locale';
import type { Shop } from '@nordcom/commerce-database';
import { MissingContextProviderError } from '@nordcom/commerce-errors';
import type { CurrencyCode } from '@shopify/hydrogen-react/storefront-api-types';
import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

type ShopContextReturns = {};

export interface ShopProviderBase {
    shop: Shop;
    /**
     * @todo TODO: This should be a part of the `shop` object.
     */
    currency: CurrencyCode;

    /**
     * @todo TODO: This should be a part of the `shop` object.
     */
    locale: Locale;
}
export interface ShopProviderProps extends ShopProviderBase {
    children: ReactNode;
}

export interface ShopContextValue extends ShopProviderBase, ShopContextReturns {}

export const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children, shop, currency, locale }: ShopProviderProps) {
    return (
        <ShopContext.Provider value={{ shop, currency: currency || 'USD', locale: locale || Locale.default }}>
            {children}
        </ShopContext.Provider>
    );
}

export const useShop = (): ShopContextValue => {
    const context = useContext(ShopContext);
    if (!context) {
        throw new MissingContextProviderError('useShop', 'ShopProvider');
    }

    return context;
};
