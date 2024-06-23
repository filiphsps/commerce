'use client';

import { createContext, useContext, useMemo } from 'react';

import type { Shop } from '@nordcom/commerce-database';
import { MissingContextProviderError } from '@nordcom/commerce-errors';

import { Locale } from '@/utils/locale';

import type { CurrencyCode } from '@shopify/hydrogen-react/storefront-api-types';
import type { ReactNode } from 'react';

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
    const value = useMemo(
        () => ({ shop, currency: currency || 'USD', locale: locale || Locale.default }),
        [shop.id, currency, locale]
    );

    return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}
ShopProvider.displayName = 'Nordcom.ShopProvider';

export const useShop = (): ShopContextValue => {
    const context = useContext(ShopContext);
    if (!context) {
        throw new MissingContextProviderError('useShop', 'ShopProvider');
    }

    return context;
};
