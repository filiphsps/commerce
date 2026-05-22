'use client';

import type { ReactNode } from 'react';
import ProductCardActions from '@/components/product-card/primitives/product-card-actions';
import ProductCardImage from '@/components/product-card/primitives/product-card-image';
import ProductCardOptions from '@/components/product-card/primitives/product-card-options';
import ProductCardPrice from '@/components/product-card/primitives/product-card-price';
import ProductCardStockUrgency from '@/components/product-card/primitives/product-card-stock-urgency';

export type VerticalBoxedProps = {
    title: ReactNode;
    badges: ReactNode;
};

const VerticalBoxed = ({ title, badges }: VerticalBoxedProps) => (
    <>
        <div className="relative">
            <ProductCardImage />
            {badges}
        </div>
        <div className="flex grow flex-col gap-1 pt-1">
            {title}
            <ProductCardPrice />
            <ProductCardStockUrgency />
            <ProductCardOptions />
            <ProductCardActions mode="full" />
        </div>
    </>
);

VerticalBoxed.displayName = 'Nordcom.ProductCard.Variant.VerticalBoxed';
export default VerticalBoxed;
