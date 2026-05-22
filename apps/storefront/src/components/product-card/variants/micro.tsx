'use client';

import type { ReactNode } from 'react';
import { useProductCardContext } from '@/components/product-card/context';
import ProductCardActions from '@/components/product-card/primitives/product-card-actions';
import ProductCardImage from '@/components/product-card/primitives/product-card-image';
import ProductCardPrice from '@/components/product-card/primitives/product-card-price';
import { filterRealOptions } from '@/utils/has-product-options';
import { cn } from '@/utils/tailwind';

export type MicroProps = {
    title: ReactNode;
    badges: ReactNode;
};

const Micro = ({ title }: MicroProps) => {
    const { data: product } = useProductCardContext();
    const realOptions = filterRealOptions(product.options ?? []);
    const totalVariants = realOptions.reduce((acc, o) => acc * o.values.length, 1);

    return (
        <>
            <div className="relative h-10 w-10 shrink-0">
                <ProductCardImage />
            </div>
            <div className="flex min-w-0 grow flex-col">
                <div className="truncate">{title}</div>
                {totalVariants > 1 ? (
                    <span
                        className={cn(
                            '[font-size:var(--product-card-vendor-size)]',
                            '[color:var(--product-card-vendor-color)]',
                        )}
                    >
                        {totalVariants} variants
                    </span>
                ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
                <ProductCardPrice />
                <ProductCardActions mode="icon" />
            </div>
        </>
    );
};

Micro.displayName = 'Nordcom.ProductCard.Variant.Micro';
export default Micro;
