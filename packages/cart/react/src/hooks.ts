'use client';

import type { CartActionResult, CartCapabilities, CartMutation } from '@nordcom/cart-core';
import { CartProviderError } from '@nordcom/cart-core';
import { useContext } from 'react';
import type { CartActions } from './actions-type';
import {
    CartActionsContext,
    CartCapabilitiesContext,
    CartCostContext,
    type CartCostValue,
    CartCountContext,
    CartDispatchContext,
    CartLinesContext,
    type CartLinesValue,
    CartMetaContext,
    type CartMetaValue,
    CartPendingContext,
    CartStatusContext,
    type CartStatusValue,
} from './contexts';
import type { PendingMutation } from './types';

/**
 * Read the optimistic-aware total quantity from the nearest cart provider.
 *
 * @returns The summed line quantity used to drive cart badges. Re-renders only
 *   when the count slice changes.
 */
export function useCartCount(): number {
    return useContext(CartCountContext);
}

/**
 * Read the optimistic-aware lines slice from the nearest cart provider.
 *
 * @returns The current lines plus the confirmed cart id (or `null` before
 *   seed). Re-renders only when the lines slice changes.
 */
export function useCartLines(): CartLinesValue {
    return useContext(CartLinesContext);
}

/**
 * Read the optimistic-aware cost slice from the nearest cart provider.
 *
 * @returns The cost subtotal/total/tax/shipping plus the `stale` flag
 *   indicating that totals are predicted, not server-confirmed.
 */
export function useCartCost(): CartCostValue {
    return useContext(CartCostContext);
}

/**
 * Read the cart meta slice (discount codes, gift cards, buyer identity, note,
 * attributes, checkout URL) from the nearest provider.
 *
 * @returns Metadata copied from the projection.
 */
export function useCartMeta(): CartMetaValue {
    return useContext(CartMetaContext);
}

/**
 * Read the cart status (idle/mutating/error) and seeding flag.
 *
 * @returns Status, last error message, and whether the initial cart has been
 *   seeded into the provider.
 */
export function useCartStatus(): CartStatusValue {
    return useContext(CartStatusContext);
}

/**
 * Read pending mutations from the provider — either the whole queue or the
 * single entry currently targeting a specific line id.
 *
 * @param lineId - Optional line id to narrow to. Matches temp ids for
 *   predicted adds and real ids for update/remove mutations.
 * @returns The full queue when no line id is provided, the matching pending
 *   mutation when one is found, or `null` for an unmatched line id.
 */
export function useCartPending(lineId?: string): PendingMutation[] | PendingMutation | null {
    const pending = useContext(CartPendingContext);
    if (!lineId) return pending;
    const match = pending.find((p) => {
        if (p.tempLineId === lineId) return true;
        const m = p.mutation;
        if (m.kind === 'update-line' || m.kind === 'remove-line') return m.lineId === lineId;
        return false;
    });
    return match ?? null;
}

/**
 * Read the cart capabilities surfaced by the kernel snapshot. Throws when
 * called outside a `<CartProvider>` to guard consumers that depend on the
 * capability matrix to drive conditional UI.
 *
 * @returns The capabilities object reported by the active adapter.
 * @throws CartProviderError when called outside `<CartProvider>`.
 */
export function useCartCapabilities(): CartCapabilities {
    const caps = useContext(CartCapabilitiesContext);
    if (!caps) {
        throw new CartProviderError('useCartCapabilities must be used inside <CartProvider>.');
    }
    return caps;
}

/**
 * Read the capability-typed actions object built by the provider. Throws
 * when used outside `<CartProvider>` because callers expect a guaranteed
 * `addLine`/`updateLine`/`removeLine` surface.
 *
 * @typeParam C - Capability matrix; narrows the returned action surface.
 * @returns A {@link CartActions} object whose shape reflects the active
 *   capabilities.
 * @throws CartProviderError when called outside `<CartProvider>`.
 */
export function useCartActions<C extends CartCapabilities>(): CartActions<C> {
    const ctx = useContext(CartActionsContext);
    if (!ctx) {
        throw new CartProviderError('useCartActions must be used inside <CartProvider>.');
    }
    return ctx as CartActions<C>;
}

/**
 * Read the low-level dispatch function that bypasses the capability-typed
 * action surface — useful for custom mutations carried via `CartMutation`.
 *
 * @returns A function that accepts a {@link CartMutation} and resolves to a
 *   {@link CartActionResult}.
 * @throws CartProviderError when called outside `<CartProvider>`.
 */
export function useCartDispatch(): (m: CartMutation) => Promise<CartActionResult> {
    const dispatchFn = useContext(CartDispatchContext);
    if (!dispatchFn) {
        throw new CartProviderError('useCartDispatch must be used inside <CartProvider>.');
    }
    return dispatchFn;
}

/**
 * Composite hook stitching every slice into the shape historically returned
 * by the storefront's monolithic `useCart`. Prefer the focused slice hooks
 * for new consumers — calling all slices forces re-renders on every change.
 *
 * @returns An object with `cart` (when seeded), status fields, and the
 *   capability-typed action methods.
 * @throws CartProviderError when called outside `<CartProvider>`.
 */
export function useCart() {
    const actions = useCartActions();
    const count = useCartCount();
    const lines = useCartLines();
    const cost = useCartCost();
    const meta = useCartMeta();
    const status = useCartStatus();
    return {
        cart: lines.cartId ? { id: lines.cartId, totalQuantity: count, lines: lines.lines, cost, ...meta } : null,
        ...status,
        ...actions,
    };
}

/**
 * Variant of {@link useCart} that returns `null` when no provider is mounted.
 * Useful for components rendered both inside and outside the cart tree (e.g.,
 * shared header components on auth-only routes).
 *
 * @returns The same shape as {@link useCart}, or `null` when no provider is
 *   present.
 */
export function useMaybeCart() {
    const actions = useContext(CartActionsContext);
    const count = useCartCount();
    const lines = useCartLines();
    const cost = useCartCost();
    const meta = useCartMeta();
    const status = useCartStatus();
    if (!actions) return null;
    return {
        cart: lines.cartId ? { id: lines.cartId, totalQuantity: count, lines: lines.lines, cost, ...meta } : null,
        ...status,
        ...(actions as CartActions<CartCapabilities>),
    };
}
