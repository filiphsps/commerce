'use client';

import FloatPill from './float-pill';
import InlineButton from './inline-button';
import type { ProductCardCtaComponent } from './types';

const registry = new Map<string, ProductCardCtaComponent>([
    ['float-pill', FloatPill],
    ['inline-button', InlineButton],
]);

/**
 * Registers a custom CTA component under the given name, replacing any existing entry.
 *
 * @param name - Unique key used to look up the component via `getProductCardCta`.
 * @param component - The CTA component to register.
 */
export function registerProductCardCta(name: string, component: ProductCardCtaComponent) {
    registry.set(name, component);
}

/**
 * Retrieves the registered CTA component for the given name, falling back to `float-pill`.
 *
 * @param name - Registry key of the desired CTA component.
 * @returns The matching component, or the `float-pill` fallback when no match is found.
 */
export function getProductCardCta(name: string): ProductCardCtaComponent {
    const found = registry.get(name);
    if (found) return found;
    const fallback = registry.get('float-pill');
    if (!fallback) throw new Error('product-card CTA registry has no float-pill fallback registered');
    return fallback;
}
