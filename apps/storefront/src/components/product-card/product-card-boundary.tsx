'use client';

import type { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

export type ProductCardBoundaryProps = {
    fallback: ReactNode;
    children: ReactNode;
};

/**
 * Per-card error isolation boundary.
 *
 * The interactive card primitives (`ProductCardCta`, `ProductCardPicker`) call
 * `useCartActions()`, which throws `CartProviderError` whenever the cart context is
 * transiently absent — e.g. a cache-driven request re-renders a card subtree before the
 * cart provider has hydrated. The throw happens at the top of those hooks, before any
 * `null` guard, so reordering the guards cannot prevent it. The only enclosing boundaries
 * are the page-level `fallbackRender={() => null}` guards in `providers-registry`, which
 * means a single card's transient throw nulls the entire product grid.
 *
 * Wrapping only the cart-dependent primitives (not the whole card) with a `null` fallback
 * contains the throw to that primitive: the card chassis — imagery, title, and price —
 * renders outside the boundary and always survives, every other card stays mounted, and
 * only the add-to-cart affordance is dropped until a later render restores the cart
 * context. A `null` fallback (vs. a duplicate static card) keeps each card's chassis in
 * the Flight payload exactly once.
 *
 * @param props.fallback - Rendered in place of `children` when the guarded subtree throws; pass `null` to drop just the affordance.
 * @param props.children - Cart-dependent subtree guarded by the boundary.
 * @returns The error boundary wrapping `children`.
 */
export function ProductCardBoundary({ fallback, children }: ProductCardBoundaryProps) {
    return <ErrorBoundary fallbackRender={() => fallback}>{children}</ErrorBoundary>;
}

ProductCardBoundary.displayName = 'Nordcom.ProductCard.Boundary';
