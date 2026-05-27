'use client';

import type { Cart } from '@nordcom/cart-core';

/**
 * Renders a hidden `<div>` whose data attributes carry the initial cart id and
 * shop id for the client runtime to read on mount. Kept in a separate Client
 * Component so {@link CartHydrator} remains a Server Component.
 *
 * @param props.initialCart - Cart fetched server-side, or `null` before a cart exists.
 * @param props.shopId - Tenant shop id written to `data-shop-id`.
 * @returns A display-none `<div>` with hydration data attributes.
 */
export function CartHydratorClient({ initialCart, shopId }: { initialCart: Cart | null; shopId: string }) {
    return (
        <div
            data-cart-hydrator
            data-shop-id={shopId}
            data-cart-id={initialCart?.id ?? 'null'}
            style={{ display: 'none' }}
        />
    );
}
