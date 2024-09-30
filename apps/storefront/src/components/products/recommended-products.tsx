import 'server-only';

import { Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';

import { ShopifyApolloApiClient } from '@/api/shopify';
import { RecommendationApi } from '@/api/shopify/recommendation';

import ProductCard from '@/components/product-card/product-card';

import CollectionBlock from './collection-block';

import type { Product } from '@/api/product';
import type { Locale } from '@/utils/locale';

export type RecommendedProductsProps = {
    shop: OnlineShop;
    locale: Locale;

    product?: Product;
    className?: string;
};
const RecommendedProducts = async ({ shop, locale, product, className }: RecommendedProductsProps) => {
    if (!product?.id) {
        return null;
    }

    const api = await ShopifyApolloApiClient({ shop, locale });
    try {
        const recommended = await RecommendationApi({ api, id: product.id });

        return (
            <CollectionBlock shop={shop} locale={locale} className={className} isHorizontal={true}>
                {recommended.map((product) => (
                    <Suspense key={product.id} fallback={<ProductCard.skeleton />}>
                        <ProductCard shop={shop} locale={locale} data={product} priority={false} />
                    </Suspense>
                ))}
            </CollectionBlock>
        );
    } catch {
        return null;
    }
};
RecommendedProducts.displayName = 'Nordcom.Products.RecommendedProducts';

RecommendedProducts.skeleton = () => {
    return <CollectionBlock.skeleton isHorizontal={true} />;
};
(RecommendedProducts.skeleton as any).displayName = 'Nordcom.Products.RecommendedProducts.Skeleton';

export { RecommendedProducts };
