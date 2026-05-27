import type { Cart, CartActionResult, CartCapabilities, CartMutation, Money } from '@nordcom/cart-core';
import { createContext } from 'react';
import type { CartStatus, PendingMutation } from './types';

export type CartCountValue = number;
export type CartLinesValue = { lines: Cart['lines']; cartId: string | null };
export type CartCostValue = {
    subtotal: Money | null;
    total: Money | null;
    tax: Money | null;
    shipping: Money | null;
    stale: boolean;
};
export type CartMetaValue = {
    discountCodes: Cart['discountCodes'];
    giftCards: Cart['giftCards'];
    buyerIdentity: Cart['buyerIdentity'];
    note: string | null;
    attributes: Cart['attributes'];
    checkoutUrl: string | null;
};
export type CartStatusValue = { status: CartStatus; error: string | null; cartReady: boolean };
export type CartPendingValue = PendingMutation[];

export const CartCountContext = createContext<CartCountValue>(0);
export const CartLinesContext = createContext<CartLinesValue>({ lines: [], cartId: null });
export const CartCostContext = createContext<CartCostValue>({
    subtotal: null,
    total: null,
    tax: null,
    shipping: null,
    stale: false,
});
export const CartMetaContext = createContext<CartMetaValue>({
    discountCodes: [],
    giftCards: [],
    buyerIdentity: null,
    note: null,
    attributes: [],
    checkoutUrl: null,
});
export const CartStatusContext = createContext<CartStatusValue>({
    status: 'loading',
    error: null,
    cartReady: false,
});
export const CartPendingContext = createContext<CartPendingValue>([]);
export const CartCapabilitiesContext = createContext<CartCapabilities | null>(null);
export const CartActionsContext = createContext<unknown>(null);
export const CartDispatchContext = createContext<((m: CartMutation) => Promise<CartActionResult>) | null>(null);
