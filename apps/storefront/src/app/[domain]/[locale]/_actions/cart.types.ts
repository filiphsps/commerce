// Constants and types for the cart server actions. Lives in a sibling module
// because Next.js's file-level `'use server'` directive in `./cart.ts` only
// permits async function exports — any non-function export (or type export)
// at the top level of a `'use server'` file is a build error.

/**
 * Forward-compatible cookie name. The current storefront persists the cart id
 * client-side via `@shopify/hydrogen-react`'s `CartProvider`; when the cart
 * layer moves server-side this cookie becomes the source of truth. Kept here
 * so callers/tests can target a stable name.
 */
export const CART_COOKIE = 'nordcom-cart-id';

export type CartActionFailureReason =
    | 'missing-variant'
    | 'missing-line'
    | 'missing-cart'
    | 'missing-shop'
    | 'invalid-quantity'
    | 'not-implemented';

export type CartActionResult = {
    ok: boolean;
    /**
     * Machine-readable reason on `ok === false`. Stable strings for the client
     * form-host to switch on. Never localized — that's the UI's job.
     */
    reason?: CartActionFailureReason;
    /**
     * Echoed back so the client can correlate the optimistic apply with the
     * server ack. Optional because cart creation flows may not have an id yet.
     */
    cartId?: string;
};
