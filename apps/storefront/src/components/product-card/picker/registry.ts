'use client';

import type { ProductCardPickerComponent } from './types';

const registry = new Map<string, ProductCardPickerComponent>();

export function registerProductCardPicker(name: string, component: ProductCardPickerComponent) {
    registry.set(name, component);
}

export function getProductCardPicker(name: string): ProductCardPickerComponent {
    const found = registry.get(name);
    if (found) return found;
    const fallback = registry.get('float');
    if (!fallback) throw new Error('product-card picker registry has no float fallback registered');
    return fallback;
}
