'use client';

import type { OnlineShop } from '@nordcom/commerce-db';
import { MissingContextProviderError } from '@nordcom/commerce-errors';
import type { CurrencyCode } from '@shopify/hydrogen-react/storefront-api-types';
import type { ReactNode } from 'react';
import { createContext, useContext, useMemo } from 'react';
import { Locale } from '@/utils/locale';

/**
 * Resolves the active presentment currency: an explicit override wins, then the shop's configured
 * default (`commerce.currency`), then `'USD'`.
 *
 * @param shop - The tenant shop record.
 * @param explicit - An optional request-level currency override.
 * @returns The ISO currency code to display before the cart resolves its own currency.
 */
export function resolveShopCurrency(shop: OnlineShop, explicit?: CurrencyCode): CurrencyCode {
    return (explicit ?? (shop.commerce?.currency as CurrencyCode | undefined) ?? 'USD') as CurrencyCode;
}

type ShopContextReturns = {};

export interface ShopProviderBase {
    shop: OnlineShop;
    /**
     * The shop's default presentment currency, sourced from `shop.commerce.currency` upstream and
     * used for price display before the cart resolves its own currency.
     */
    currency: CurrencyCode;

    /**
     * Active request locale, resolved by the `request → shop default → platform default` chain before
     * this provider. Intentionally a prop, not a shop field: one shop serves many locales.
     */
    locale: Locale;
}
export interface ShopProviderProps extends ShopProviderBase {
    children: ReactNode;
}

export interface ShopContextValue extends ShopProviderBase, ShopContextReturns {}

export const ShopContext = createContext<ShopContextValue | null>(null);

/**
 * Makes shop, currency, and locale available to the client-side component tree.
 *
 * @param props.shop - The resolved `OnlineShop` record for the current tenant.
 * @param props.currency - Active currency code; defaults to `'USD'`.
 * @param props.locale - Active locale; defaults to `Locale.default`.
 * @param props.children - Component subtree that will consume `ShopContext`.
 */
export function ShopProvider({ children, shop, currency = 'USD', locale = Locale.default }: ShopProviderProps) {
    const value = useMemo(() => ({ shop, currency, locale }), [shop, currency, locale]);

    return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}
ShopProvider.displayName = 'Nordcom.ShopProvider';

/**
 * Returns the current `ShopContext` value.
 *
 * @returns The shop context containing shop, currency, and locale.
 * @throws {MissingContextProviderError} When called outside of a `ShopProvider`.
 */
export const useShop = (): ShopContextValue => {
    const context = useContext(ShopContext);
    if (!context) {
        throw new MissingContextProviderError('useShop', 'ShopProvider');
    }

    return context;
};

/**
 * Like `useShop`, but returns `null` instead of throwing when called outside
 * `ShopProvider`. Use this in error boundaries and other components that may
 * render before the provider is mounted.
 */
export const useOptionalShop = (): ShopContextValue | null => useContext(ShopContext);
