'use client';

import { Suspense, useState } from 'react';

import { FirstAvailableVariant } from '@/utils/first-available-variant';
import { cn } from '@/utils/tailwind';

import ProductCardFooter from '@/components/product-card/product-card-footer';
import { Pricing } from '@/components/typography/pricing';

import type { Product } from '@/api/product';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import type { ReactNode } from 'react';

export type ProductCardFooterProps = {
    data?: Product;
    locale: Locale;
    i18n: LocaleDictionary;
    children?: ReactNode;
};
const ProductCardContent = ({ data: product, locale, i18n, children }: ProductCardFooterProps) => {
    const [selectedVariant, setSelectedVariant] = useState(FirstAvailableVariant(product)!);
    if (!product) {
        return null;
    }

    const { price, compareAtPrice } = selectedVariant;
    const onSale = compareAtPrice ? compareAtPrice.amount !== price.amount : false;

    return (
        <div className="flex h-full min-h-24 w-full grow flex-col pt-1">
            <div className="flex grow flex-col justify-start">
                <div className="flex flex-nowrap items-center justify-start gap-1">
                    <Pricing price={price} className={cn(onSale && 'font-extrabold text-red-600')} />

                    {onSale ? (
                        <Pricing
                            price={compareAtPrice}
                            className="text-xs font-medium leading-none text-gray-400 line-through"
                        />
                    ) : null}
                </div>
            </div>

            {children}

            <Suspense fallback={<div className="flex h-full min-h-24 w-full grow flex-col pt-1" data-skeleton />}>
                <ProductCardFooter
                    data={product}
                    locale={locale}
                    i18n={i18n}
                    selected={selectedVariant}
                    setSelected={setSelectedVariant}
                />
            </Suspense>
        </div>
    );
};

ProductCardContent.displayName = 'Nordcom.ProductCard.Content';
export default ProductCardContent;
