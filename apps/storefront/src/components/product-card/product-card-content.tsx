'use client';

import { Suspense, useState } from 'react';

import { BuildConfig } from '@/utils/build-config';
import { FirstAvailableVariant } from '@/utils/first-available-variant';
import { cn } from '@/utils/tailwind';
import { parseGid } from '@shopify/hydrogen-react';

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
    const [selectedVariant, setSelectedVariant] = useState(FirstAvailableVariant(product)!);
    if (!product) {
        return null;
    }

    const { price, compareAtPrice } = selectedVariant;
    const onSale = compareAtPrice ? compareAtPrice.amount !== price.amount : false;

    return (
        <>
            <Suspense>
                <ProductCardHeader data={product} selectedVariant={selectedVariant} priority={priority}>
                    {children}
                </ProductCardHeader>
            </Suspense>

            <div className="flex h-full min-h-24 w-full grow flex-col pt-1" suppressHydrationWarning={true}>
                {BuildConfig.environment === 'development' ? (
                    <div
                        className="jdgm-widget jdgm-preview-badge leading-relaxed"
                        data-id={parseGid(product.id).id}
                        suppressHydrationWarning={true}
                    ></div>
                ) : null}

                <div className="flex grow flex-col justify-end">
                    <div className="flex flex-wrap-reverse items-center justify-start gap-1">
                        <Pricing price={price} className={cn('text-xl', onSale && 'font-extrabold text-red-600')} />

                        {onSale ? (
                            <Pricing
                                price={compareAtPrice}
                                className="text-sm font-medium leading-none text-gray-400 line-through"
                            />
                        ) : null}
                    </div>
                </div>

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
        </>
    );
};

ProductCardContent.displayName = 'Nordcom.ProductCard.Content';
export default ProductCardContent;
