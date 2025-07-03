'use client';

import { Suspense, useState } from 'react';

import { firstAvailableVariant } from '@/utils/first-available-variant';
import { cn } from '@/utils/tailwind';

import ProductCardFooter from '@/components/product-card/product-card-footer';
import ProductCardHeader from '@/components/product-card/product-card-header';
import { Pricing } from '@/components/typography/pricing';

import type { Product } from '@/api/product';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import type { ReactNode } from 'react';

export type ProductCardFooterProps = {
    data?: Product;
    priority?: boolean;

    locale: Locale;
    i18n: LocaleDictionary;

    children?: ReactNode;
};
const ProductCardContent = ({ data: product, priority, locale, i18n, children }: ProductCardFooterProps) => {
    const [selectedVariant, setSelectedVariant] = useState(firstAvailableVariant(product)!);
    if (!product) {
        return null;
    }

    const { price, compareAtPrice } = selectedVariant;
    const onSale = compareAtPrice ? compareAtPrice.amount !== price.amount : false;

    return (
        <>
            <Suspense>
                <ProductCardHeader data={product} selectedVariant={selectedVariant} priority={priority}>
                    {children as any}
                </ProductCardHeader>
            </Suspense>

            <div className="flex h-full min-h-24 w-full grow flex-col pt-1" suppressHydrationWarning={true}>
                <div className="flex grow flex-col justify-end">
                    <div className="flex flex-wrap-reverse items-center justify-start gap-1 pt-2">
                        <Pricing
                            price={price}
                            className={cn(
                                'text-lg font-bold text-gray-700',
                                onSale && 'text-xl font-black text-red-600'
                            )}
                        />

                        {onSale ? (
                            <Pricing
                                price={compareAtPrice}
                                className="text-sm font-medium leading-none text-gray-400 line-through"
                            />
                        ) : null}
                    </div>
                </div>

                <Suspense fallback={<div className="flex h-full min-h-24 w-full grow flex-col" data-skeleton />}>
                    <ProductCardFooter
                        data={product}
                        locale={locale}
                        i18n={i18n}
                        selected={selectedVariant}
                        setSelected={setSelectedVariant}
                    />
                </Suspense>
            </div>
        </>
    );
};

ProductCardContent.displayName = 'Nordcom.ProductCard.Content';
export default ProductCardContent;
