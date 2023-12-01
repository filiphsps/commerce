import type { Shop } from '@/api/shop';
import type { CurrencyCode } from '@shopify/hydrogen-react/storefront-api-types';
import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

type ShopContextReturns = {};

export interface ShopProviderBase {
    shop: Shop;
    currency: CurrencyCode;
}
export interface ShopProviderProps extends ShopProviderBase {
    children: ReactNode;
}

export interface ShopContextValue extends ShopProviderBase, ShopContextReturns {}

export const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children, shop }: ShopProviderProps) {
    return <ShopContext.Provider value={{ shop, currency: 'USD' }}>{children}</ShopContext.Provider>;
}

export const useShop = (): ShopContextValue => {
    const context = useContext(ShopContext);
    if (!context) throw new Error('useShop() must be used within a ShopProvider.');

    return context;
};
