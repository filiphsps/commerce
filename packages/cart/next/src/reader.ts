import type { AdapterCtx, Cart, CartExt, CartKernel } from '@nordcom/cart-core';
import { CartNotFoundError } from '@nordcom/cart-core';
import { cache } from 'react';

import type { CartIdStorage } from './storage';

/**
 * Match the not-found error shape both by `instanceof` and by `.name`, which
 * lets us tolerate the error class crossing realm/bundle boundaries (the host
 * adapter may have its own copy of cart-core depending on bundler config).
 *
 * @param error - Caught value from a kernel call.
 * @returns `true` when the error represents a missing cart.
 */
function isCartNotFound(error: unknown): boolean {
    if (error instanceof CartNotFoundError) return true;
    return (error as { name?: string } | null)?.name === 'CartNotFoundError';
}

/**
 * Builds an RSC-safe reader that resolves the active cart for the current
 * request. The reader is wrapped in `react.cache` so that multiple Server
 * Components rendering in one request share a single adapter call.
 *
 * When the stored id no longer resolves on the provider — either `null` from
 * the adapter or a thrown {@link CartNotFoundError} — the reader clears the
 * storage so the next request creates a fresh cart instead of resurrecting a
 * dangling id.
 *
 * @param opts.kernel - Cart kernel whose adapter knows how to read carts.
 * @param opts.storage - Persistence layer holding the active cart id.
 * @returns Async reader returning the resolved {@link Cart} or `null`.
 */
export function createCartReader<TExt extends CartExt = {}, TShop = unknown>(opts: {
    kernel: CartKernel<TExt, TShop>;
    storage: CartIdStorage;
}): (ctx: AdapterCtx<TShop>) => Promise<Cart<TExt> | null> {
    return cache(async (ctx: AdapterCtx<TShop>): Promise<Cart<TExt> | null> => {
        const cartId = await opts.storage.get();
        if (!cartId) return null;
        try {
            const cart = await opts.kernel.read(ctx, { cartId });
            if (cart === null) {
                await opts.storage.clear();
            }
            return cart;
        } catch (error) {
            if (isCartNotFound(error)) {
                await opts.storage.clear();
                return null;
            }
            throw error;
        }
    });
}

/**
 * Builds an "ensure a cart exists" helper for server actions and RSC entry
 * points that need a non-null cart to operate on. Delegates to the supplied
 * reader for the existing-cart path so cache dedup is preserved, then falls
 * back to `kernel.create({})` + `storage.set(cart.id)` when nothing is
 * stored.
 *
 * @param opts.kernel - Cart kernel used to create a fresh cart when needed.
 * @param opts.storage - Persistence layer the new cart id is written to.
 * @param opts.reader - Reader created via {@link createCartReader} — passed
 *   in so callers can share one `react.cache` instance across reader and
 *   ensurer.
 * @returns Async ensurer that always resolves to a {@link Cart}.
 */
export function createCartEnsurer<TExt extends CartExt = {}, TShop = unknown>(opts: {
    kernel: CartKernel<TExt, TShop>;
    storage: CartIdStorage;
    reader: (ctx: AdapterCtx<TShop>) => Promise<Cart<TExt> | null>;
}): (ctx: AdapterCtx<TShop>) => Promise<Cart<TExt>> {
    return async (ctx) => {
        const existing = await opts.reader(ctx);
        if (existing) return existing;
        const cart = await opts.kernel.create(ctx, {});
        await opts.storage.set(cart.id);
        return cart;
    };
}
