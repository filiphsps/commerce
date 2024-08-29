/* eslint-disable react-hooks/rules-of-hooks */
import 'server-only';

import styles from '@/components/products/collection-block.module.scss';
import extraStyles from '@/components/products/recommended-products.module.scss';

import { Suspense } from 'react';

import { type OnlineShop } from '@nordcom/commerce-db';

import { ShopifyApolloApiClient } from '@/api/shopify';
import { RecommendationApi } from '@/api/shopify/recommendation';
import { type Locale } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

import ProductCard from '@/components/product-card/product-card';

import type { Product } from '@/api/product';

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
                styles.container,
                styles.content,
                styles.horizontal,
                'overflow-x-shadow',
                extraStyles.container,
                className
            )}
        >
            {recommended.map((product) => (
                <Suspense key={product.id} fallback={<ProductCard.skeleton />}>
                    <ProductCard shop={shop} locale={locale} data={product} className={cn(extraStyles.card)} />
                </Suspense>
            ))}
        </div>
    );
};
RecommendedProducts.displayName = 'Nordcom.Products.RecommendedProducts';

RecommendedProducts.skeleton = () => {
    return <section className={`${styles.container} ${styles.horizontal} ${extraStyles.container}`} />;
};
(RecommendedProducts.skeleton as any).displayName = 'Nordcom.Products.RecommendedProducts.Skeleton';

export { RecommendedProducts };
