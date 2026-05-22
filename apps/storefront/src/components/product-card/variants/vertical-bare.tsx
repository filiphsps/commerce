'use client';

import type { ReactNode } from 'react';
import ProductCardActions from '@/components/product-card/primitives/product-card-actions';
import ProductCardImage from '@/components/product-card/primitives/product-card-image';
import ProductCardOptions from '@/components/product-card/primitives/product-card-options';
import ProductCardPrice from '@/components/product-card/primitives/product-card-price';
import ProductCardStockUrgency from '@/components/product-card/primitives/product-card-stock-urgency';

export type VerticalBareProps = {
    title: ReactNode;
    badges: ReactNode;
};

const VerticalBare = ({ title, badges }: VerticalBareProps) => (
    <>
        <div className="relative">
            <ProductCardImage />
            {badges}
        </div>
        <div className="flex grow flex-col gap-1 pt-2">
            {title}
            <ProductCardPrice />
            <ProductCardStockUrgency />
            <ProductCardOptions />
            <ProductCardActions mode="full" />
        </div>
    </>
);

VerticalBare.displayName = 'Nordcom.ProductCard.Variant.VerticalBare';
export default VerticalBare;
