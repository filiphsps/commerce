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
