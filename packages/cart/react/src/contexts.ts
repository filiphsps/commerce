import type { Cart, CartActionResult, CartCapabilities, CartMutation, Money } from '@nordcom/cart-core';
import { createContext } from 'react';
import type { CartStatus, PendingMutation } from './types';

/** Optimistic total quantity across all lines. Sourced from `CartCountContext`. */
export type CartCountValue = number;

/** Active lines and the confirmed cart identifier. Sourced from `CartLinesContext`. */
export type CartLinesValue = { lines: Cart['lines']; cartId: string | null };

/**
 * Optimistic cost slice for the cart. `stale` is `true` when at least one
 * pending mutation has been applied to the projected totals but not yet
 * confirmed by the server. Sourced from `CartCostContext`.
 */
export type CartCostValue = {
    subtotal: Money | null;
    total: Money | null;
    tax: Money | null;
    shipping: Money | null;
    stale: boolean;
};

/**
 * Metadata associated with the cart: discount codes, gift cards, buyer
 * identity, order note, custom attributes, and the Shopify checkout URL.
 * Sourced from `CartMetaContext`.
 */
export type CartMetaValue = {
    discountCodes: Cart['discountCodes'];
    giftCards: Cart['giftCards'];
    buyerIdentity: Cart['buyerIdentity'];
    note: string | null;
    attributes: Cart['attributes'];
    checkoutUrl: string | null;
};

/**
 * Current lifecycle status of the cart provider. `cartReady` flips to `true`
 * after the first successful seed from the server; `error` holds the last
 * failure message when `status === 'error'`. Sourced from `CartStatusContext`.
 */
export type CartStatusValue = { status: CartStatus; error: string | null; cartReady: boolean };

/** Full list of mutations currently in the optimistic queue. Sourced from `CartPendingContext`. */
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
