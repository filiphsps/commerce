import type { Cart } from '@nordcom/cart-core';
import { CartHydratorClient } from './hydrator-client';

/**
 * Server-renderable entry point that seeds the client-side cart hydration
 * marker. Delegates to a client component that renders a hidden element
 * carrying the initial cart id and shop id, so the client layer can bootstrap
 * without an extra network round-trip.
 *
 * @param props.initialCart - Cart fetched at render time, or `null` before a
 *   cart has been created for this visitor.
 * @param props.shopId - Tenant shop id; scopes the hydration marker to the
 *   correct cart provider.
 * @returns A {@link CartHydratorClient} element.
 * @example
 * ```tsx
 * <CartHydrator initialCart={serverCart} shopId={shop.id} />
 * ```
 */
export function CartHydrator({ initialCart, shopId }: { initialCart: Cart | null; shopId: string }) {
    return <CartHydratorClient initialCart={initialCart} shopId={shopId} />;
}
