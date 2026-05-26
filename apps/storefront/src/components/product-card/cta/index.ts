'use client';

// Side-effecting imports register the default CTA strategies in the module-level
// registry. Order is irrelevant — both register under distinct names.
import './float-pill';
import './inline-button';

export { getProductCardCta, registerProductCardCta } from './registry';
export type { ProductCardCtaComponent, ProductCardCtaProps } from './types';
