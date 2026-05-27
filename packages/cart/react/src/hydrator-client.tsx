'use client';

import type { Cart } from '@nordcom/cart-core';

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
