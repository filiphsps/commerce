import 'server-only';

import { Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';

import { ShopifyApolloApiClient } from '@/api/shopify';
import { RecommendationApi } from '@/api/shopify/recommendation';
import { cn } from '@/utils/tailwind';

import ProductCard from '@/components/product-card/product-card';

import type { Product } from '@/api/product';
import type { Locale } from '@/utils/locale';

export type RecommendedProductsProps = {
    shop: OnlineShop;
    locale: Locale;

    product?: Product;
    className?: string;
};
const RecommendedProducts = async ({ shop, locale, product, className }: RecommendedProductsProps) => {
    if (!product) {
        return null;
    }

    const api = await ShopifyApolloApiClient({ shop, locale });
    const recommended = await RecommendationApi({ api, id: product.id });

    return (
        <div
            className={cn(
                'overflow-x-shadow grid w-full auto-cols-[minmax(12rem,1fr)] grid-flow-col grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] grid-rows-1 gap-2 overscroll-x-auto sm:auto-cols-[minmax(14rem,1fr)] sm:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]',
                className
            )}
        >
            {recommended.map((product) => (
                <Suspense key={product.id} fallback={<ProductCard.skeleton />}>
                    <ProductCard shop={shop} locale={locale} data={product} className="" />
                </Suspense>
            ))}
        </div>
    );
};
RecommendedProducts.displayName = 'Nordcom.Products.RecommendedProducts';

RecommendedProducts.skeleton = () => {
    return <section className="" />;
};
(RecommendedProducts.skeleton as any).displayName = 'Nordcom.Products.RecommendedProducts.Skeleton';

export { RecommendedProducts };
