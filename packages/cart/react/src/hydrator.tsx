import type { Cart } from '@nordcom/cart-core';
import { CartHydratorClient } from './hydrator-client';

export function CartHydrator({ initialCart, shopId }: { initialCart: Cart | null; shopId: string }) {
    return <CartHydratorClient initialCart={initialCart} shopId={shopId} />;
}
