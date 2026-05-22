'use client';

import type { ReactNode } from 'react';
import ProductCardActions from '@/components/product-card/primitives/product-card-actions';
import ProductCardImage from '@/components/product-card/primitives/product-card-image';
import ProductCardOptions from '@/components/product-card/primitives/product-card-options';
import ProductCardPrice from '@/components/product-card/primitives/product-card-price';
import ProductCardStockUrgency from '@/components/product-card/primitives/product-card-stock-urgency';

export type HorizontalBoxedProps = {
    title: ReactNode;
    badges: ReactNode;
};

const HorizontalBoxed = ({ title, badges }: HorizontalBoxedProps) => (
    <>
        <div className="relative w-24 shrink-0">
            <ProductCardImage />
            {badges}
        </div>
        <div className="flex min-w-0 grow flex-col gap-1">
            {title}
            <ProductCardStockUrgency />
            <ProductCardOptions />
        </div>
        <div className="flex shrink-0 flex-col items-end justify-between gap-2 py-1">
            <ProductCardPrice />
            <ProductCardActions mode="icon" />
        </div>
    </>
);

HorizontalBoxed.displayName = 'Nordcom.ProductCard.Variant.HorizontalBoxed';
export default HorizontalBoxed;
