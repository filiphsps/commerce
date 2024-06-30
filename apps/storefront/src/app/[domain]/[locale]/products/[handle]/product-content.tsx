'use client';

import styles from './page.module.scss';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import type { Shop } from '@nordcom/commerce-database';

import { cn } from '@/utils/tailwind';
import { Money, ProductProvider } from '@shopify/hydrogen-react';

import { ProductActionsContainer } from '@/components/products/product-actions-container';
import { QuantityProvider } from '@/components/products/quantity-provider';
import type { PricingProps } from '@/components/typography/pricing';

import type { Product } from '@/api/product';
import type { LocaleDictionary } from '@/utils/locale';

export type ProductContentProps = {
    shop: Shop;
    product: Product;
    i18n: LocaleDictionary;
};
export function ProductContent({ shop, product, i18n }: ProductContentProps) {
    const searchParams = useSearchParams();
    const initialVariantId = useMemo(
        () => (searchParams.has('variant') ? `gid://shopify/ProductVariant/${searchParams.get('variant')}` : undefined),
        [product, searchParams]
    );

    const [quantity, setQuantity] = useState(1);

    return (
        <ProductProvider data={product as any} initialVariantId={initialVariantId}>
            <QuantityProvider quantity={quantity} setQuantity={setQuantity}>
                <ProductActionsContainer shop={shop} i18n={i18n} className={styles.actions} />
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
export function ProductPricing({ product, ...props }: ProductPricingProps) {
    const searchParams = useSearchParams();
    const variant = useMemo(
        () =>
            searchParams.has('variant')
                ? product.variants.edges.find(({ node: { id } }) => id.includes(searchParams.get('variant')!))?.node
                : product.variants.edges[0].node,
        [product, searchParams]
    );

    if (!variant) return null;

    const price = variant.price;
    const compareAtPrice = variant.compareAtPrice;

    return (
        <>
            {compareAtPrice ? (
                <Money
                    data={compareAtPrice}
                    className="text-gray-500 line-through md:text-lg"
                    suppressHydrationWarning={true}
                />
            ) : null}
            {price ? (
                <Money
                    data={price}
                    className={cn('text-3xl font-bold md:text-4xl', compareAtPrice && 'font-extrabold text-red-500')}
                    suppressHydrationWarning={true}
                />
            ) : null}
        </>
    );
}
export function ProductPricingSkeleton({}) {
    return <div className="h-4 w-full" data-skeleton />;
}
