'use client';

import { useMemo, useState } from 'react';

import { firstAvailableVariant } from '@/utils/first-available-variant';
import { getTranslations, type LocaleDictionary } from '@/utils/locale';
import { safeParseFloat } from '@/utils/pricing';
import { cn } from '@/utils/tailwind';
import { ProductProvider } from '@shopify/hydrogen-react';
import { useSearchParams } from 'next/navigation';

import { Price } from '@/components/products/price';
import { ProductActionsContainer } from '@/components/products/product-actions-container';
import { QuantityProvider } from '@/components/products/quantity-provider';
import type { PricingProps } from '@/components/typography/pricing';

import type { Product } from '@/api/product';
import type { ProductVariant } from '@shopify/hydrogen-react/storefront-api-types';

export type ProductContentProps = {
    product: Product;
    i18n: LocaleDictionary;
};
export function ProductContent({ product, i18n }: ProductContentProps) {
    const searchParams = useSearchParams();
    const initialVariantId = useMemo(
        () =>
            searchParams.has('variant')
                ? `gid://shopify/ProductVariant/${searchParams.get('variant')}`
                : firstAvailableVariant(product)?.id,
        [product, searchParams]
    );

    const [quantity, setQuantity] = useState(1);

    return (
        <ProductProvider data={product as any} initialVariantId={initialVariantId}>
            <QuantityProvider quantity={quantity} setQuantity={setQuantity}>
                <ProductActionsContainer i18n={i18n} />
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
                : firstAvailableVariant(product),
        [product, searchParams]
    );

    if (!variant || !product.availableForSale) {
        return null;
    }

    const price = variant.price as ProductVariant['price'] | undefined;
    const compareAtPrice = variant.compareAtPrice;

    return (
        <>
            {price ? (
                <Price
                    data={price}
                    className={cn('text-2xl font-bold md:text-3xl', compareAtPrice && 'font-black text-red-500')}
                />
            ) : null}
            {compareAtPrice ? (
                <Price data={compareAtPrice} className="text-xl font-medium text-gray-500 line-through md:text-2xl" />
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
                : firstAvailableVariant(product),
        [product, searchParams]
    );
    const { t } = getTranslations('product', i18n);

    if (!variant || !product.availableForSale) {
        return null;
    }

    const price = variant.price as ProductVariant['price'] | undefined;
    const compareAtPrice = variant.compareAtPrice;
    if (!price || !compareAtPrice) {
        return null;
    }

    const totalAmount = safeParseFloat(0, price.amount);
    const compareAtAmount = safeParseFloat(0, compareAtPrice.amount);

    const savings = compareAtAmount - totalAmount;
    if (savings < 0) {
        console.error(`Savings for product ${product.id} is negative.`, savings);
        return null;
    }

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
                        <Price
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
