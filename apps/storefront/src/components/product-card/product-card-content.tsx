'use client';

import type { ReactNode } from 'react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import type { Product } from '@/api/product';

import ProductCardFooter from '@/components/product-card/product-card-footer';
import ProductCardHeader from '@/components/product-card/product-card-header';
import { Pricing } from '@/components/typography/pricing';
import { firstAvailableVariant } from '@/utils/first-available-variant';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

export type ProductCardFooterProps = {
    data?: Product;
    priority?: boolean;

    locale: Locale;
    i18n: LocaleDictionary;

    children?: ReactNode;
};

const ProductCardContent = ({ data: product, priority, locale, i18n, children }: ProductCardFooterProps) => {
    const initialVariant = useMemo(() => firstAvailableVariant(product), [product?.id]);
    const [override, setOverride] = useState<typeof initialVariant>(undefined);

    // Reset any user-selected override when the product changes, so we never
    // hold a stale variant pointer from the previous product.
    useEffect(() => {
        setOverride(undefined);
    }, [product?.id]);

    const selectedVariant = override ?? initialVariant;

    if (!product || !selectedVariant) {
        return null;
    }

    const { price, compareAtPrice } = selectedVariant;
    const onSale = compareAtPrice && price ? compareAtPrice.amount !== price.amount : false;

    return (
        <>
            <Suspense>
                <ProductCardHeader data={product} selectedVariant={selectedVariant} priority={priority}>
                    {children}
                </ProductCardHeader>
            </Suspense>

            <div
                className="flex h-full min-h-24 w-full grow flex-col pt-1"
                data-variant-id={selectedVariant.id}
                suppressHydrationWarning={true}
            >
                <div className="flex grow flex-col justify-end">
                    <div className="flex flex-wrap-reverse items-center justify-start gap-1 pt-2">
                        <Pricing
                            price={price}
                            className={cn(
                                'font-bold text-gray-700 text-lg',
                                onSale && 'font-black text-red-600 text-xl',
                            )}
                        />

                        {onSale ? (
                            <Pricing
                                price={compareAtPrice}
                                className="font-medium text-gray-400 text-sm leading-none line-through"
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
                        setSelected={setOverride}
                    />
                </Suspense>
            </div>
        </>
    );
};

ProductCardContent.displayName = 'Nordcom.ProductCard.Content';
export default ProductCardContent;
