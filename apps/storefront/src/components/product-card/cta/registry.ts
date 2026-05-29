'use client';

import { createVariantRegistry } from '../variant-registry';
import FloatPill from './float-pill';
import InlineButton from './inline-button';
import type { ProductCardCtaComponent, ProductCardCtaProps } from './types';

const registry = createVariantRegistry<ProductCardCtaProps>('product-card CTA', 'float-pill', [
    ['float-pill', FloatPill],
    ['inline-button', InlineButton],
]);

/**
 * Registers a custom CTA component under the given name, replacing any existing entry.
 *
 * @param name - Unique key used to look up the component via `getProductCardCta`.
 * @param component - The CTA component to register.
 */
export function registerProductCardCta(name: string, component: ProductCardCtaComponent): void {
    registry.register(name, component);
}

/**
 * Retrieves the registered CTA component for the given name, falling back to the built-in `float-pill`.
 *
 * @param name - Registry key of the desired CTA component.
 * @returns The matching component, or the `float-pill` fallback when no match is found.
 */
export function getProductCardCta(name: string): ProductCardCtaComponent {
    return registry.resolve(name);
}
