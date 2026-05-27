'use client';

import dynamic from 'next/dynamic';
import type { ProductCardPickerComponent } from './types';

const FloatPicker = dynamic(() => import('./float'), { ssr: false });
const SheetPicker = dynamic(() => import('./sheet'), { ssr: false });
const InlinePicker = dynamic(() => import('./inline'), { ssr: false });

const registry = new Map<string, ProductCardPickerComponent>([
    ['float', FloatPicker],
    ['sheet', SheetPicker],
    ['inline', InlinePicker],
]);

/**
 * Registers a custom picker component under the given name, replacing any existing entry.
 *
 * @param name - Unique key used to look up the component via `getProductCardPicker`.
 * @param component - The picker component to register.
 */
export function registerProductCardPicker(name: string, component: ProductCardPickerComponent) {
    registry.set(name, component);
}

/**
 * Retrieves the registered picker component for the given name, falling back to `float`.
 *
 * @param name - Registry key of the desired picker component.
 * @returns The matching component, or the `float` fallback when no match is found.
 */
export function getProductCardPicker(name: string): ProductCardPickerComponent {
    const found = registry.get(name);
    if (found) return found;
    const fallback = registry.get('float');
    if (!fallback) throw new Error('product-card picker registry has no float fallback registered');
    return fallback;
}
