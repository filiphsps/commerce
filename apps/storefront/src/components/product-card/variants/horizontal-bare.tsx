'use client';

import type { ReactNode } from 'react';
import { useProductCardContext } from '@/components/product-card/context';
import ProductCardActions from '@/components/product-card/primitives/product-card-actions';
import ProductCardImage from '@/components/product-card/primitives/product-card-image';
import ProductCardOptions from '@/components/product-card/primitives/product-card-options';
import ProductCardPrice from '@/components/product-card/primitives/product-card-price';
import ProductCardStockUrgency from '@/components/product-card/primitives/product-card-stock-urgency';

export type HorizontalBareProps = {
    title: ReactNode;
    badges: ReactNode;
};

const HorizontalBare = ({ title, badges }: HorizontalBareProps) => {
    const { data: product } = useProductCardContext();
    return (
        <>
            <div className="relative w-20 shrink-0">
                <ProductCardImage />
                {badges}
            </div>
            <div className="flex min-w-0 grow flex-col gap-1">
                {title}
                <ProductCardStockUrgency />
                <ProductCardOptions product={product} />
            </div>
            <div className="flex shrink-0 flex-col items-end justify-between gap-2">
                <ProductCardPrice />
                <ProductCardActions mode="icon" />
            </div>
        </>
    );
};

HorizontalBare.displayName = 'Nordcom.ProductCard.Variant.HorizontalBare';
export default HorizontalBare;
