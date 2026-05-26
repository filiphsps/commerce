'use client';

import type { ProductCardCtaComponent } from './types';

const registry = new Map<string, ProductCardCtaComponent>();

export function registerProductCardCta(name: string, component: ProductCardCtaComponent) {
  registry.set(name, component);
}

export function getProductCardCta(name: string): ProductCardCtaComponent {
  const found = registry.get(name);
  if (found) return found;
  const fallback = registry.get('float-pill');
  if (!fallback) throw new Error('product-card CTA registry has no float-pill fallback registered');
  return fallback;
}
