'use client';

import styles from './page.module.scss';

import { useMemo, useState } from 'react';

import { type LocaleDictionary, useTranslation } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import { Money, ProductProvider } from '@shopify/hydrogen-react';
import { useSearchParams } from 'next/navigation';

import { ProductActionsContainer } from '@/components/products/product-actions-container';
import { QuantityProvider } from '@/components/products/quantity-provider';
import type { PricingProps } from '@/components/typography/pricing';

import type { Product } from '@/api/product';

export type ProductContentProps = {
    product: Product;
    i18n: LocaleDictionary;
};
export function ProductContent({ product, i18n }: ProductContentProps) {
    const searchParams = useSearchParams();
    const initialVariantId = useMemo(
        () => (searchParams.has('variant') ? `gid://shopify/ProductVariant/${searchParams.get('variant')}` : undefined),
        [product, searchParams]
    );

    const [quantity, setQuantity] = useState(1);

    return (
        <ProductProvider data={product as any} initialVariantId={initialVariantId}>
            <QuantityProvider quantity={quantity} setQuantity={setQuantity}>
                <ProductActionsContainer i18n={i18n} className={styles.actions} />
            </QuantityProvider>
        </ProductProvider>
    );
}
export function ProductContentSkeleton({}) {
    return <section className="flex flex-col" data-skeleton />;
}

export type ProductPricingProps = {
    product: Product;
} & PricingProps;
export function ProductPricing({ product }: ProductPricingProps) {
    const searchParams = useSearchParams();
    const variant = useMemo(
        () =>
            searchParams.has('variant')
                ? product.variants.edges.find(({ node: { id } }) => id.includes(searchParams.get('variant')!))?.node
                : product.variants.edges[0].node,
        [product, searchParams]
    );

    if (!variant || !product.availableForSale) {
        return null;
    }

    const price = variant.price;
    const compareAtPrice = variant.compareAtPrice;

    return (
        <>
            {price ? (
                <Money
                    data={price}
                    className={cn('text-3xl font-bold md:text-4xl', compareAtPrice && 'font-black text-red-500')}
                    suppressHydrationWarning={true}
                />
            ) : null}
            {compareAtPrice ? (
                <Money
                    data={compareAtPrice}
                    className="text-xl font-medium text-gray-500 line-through md:text-2xl"
                    suppressHydrationWarning={true}
                />
            ) : null}
        </>
    );
}

export type ProductSavingsProps = {
    product: Product;
    i18n: LocaleDictionary;
    className?: string;
};
export function ProductSavings({ i18n, product, className }: ProductSavingsProps) {
    const searchParams = useSearchParams();
    const variant = useMemo(
        () =>
            searchParams.has('variant')
                ? product.variants.edges.find(({ node: { id } }) => id.includes(searchParams.get('variant')!))?.node
                : product.variants.edges[0].node,
        [product, searchParams]
    );
    const { t } = useTranslation('product', i18n);

    if (!variant || !product.availableForSale || !variant.price || !variant.compareAtPrice) {
        return null;
    }

    const price = variant.price;
    const compareAtPrice = variant.compareAtPrice;

    const totalAmount = Number.parseFloat(price.amount);
    const compareAtAmount = Number.parseFloat(compareAtPrice.amount);

    const savings = compareAtAmount - totalAmount;
    const discount = Math.round((100 * (compareAtAmount - totalAmount)) / Math.max(1, compareAtAmount));

    return (
        <>
            <div
                className={cn(
                    'bg-sale-stripes flex items-center justify-between gap-1 rounded-lg p-2 px-4 text-[0.82rem] font-semibold text-white md:px-5 md:text-sm',
                    className
                )}
            >
                <div className="flex items-center gap-1">
                    {t(
                        'save-n-per-item',
                        <Money
                            key={savings}
                            data={{
                                amount: savings.toString(),
                                currencyCode: price.currencyCode
                            }}
                            className="font-black"
                        />
                    )}
                </div>

                <div className="flex items-center gap-1 font-black">
                    {t('percentage-off', discount)}
                    <span className="hidden xl:block">&mdash;</span>
                    <span className="hidden font-bold xl:block">{t('what-a-deal')}</span>
                </div>
            </div>
        </>
    );
}
