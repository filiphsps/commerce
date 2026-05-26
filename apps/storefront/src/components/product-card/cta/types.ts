'use client';

import type { ComponentType } from 'react';

export type ProductCardCtaProps = {
  productHandle: string;
  seedVariantId: string;
  isSingleBuyable: boolean;
  isOpen: boolean;
  onActivate: () => void;
  onAdd: () => void;
};

export type ProductCardCtaComponent = ComponentType<ProductCardCtaProps>;
