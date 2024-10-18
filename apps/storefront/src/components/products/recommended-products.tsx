import 'server-only';

import { Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';

import { ShopifyApolloApiClient } from '@/api/shopify';
import { RecommendationApi } from '@/api/shopify/recommendation';
import { unstable_rethrow } from 'next/navigation';

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
async function Component({ shop, locale, product, className }: Readonly<RecommendedProductsProps>) {
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
    } catch (error: unknown) {
        unstable_rethrow(error);

        return null;
    }
}

function Skeleton({ className }: { className?: string }) {
    return <CollectionBlock.skeleton isHorizontal={true} className={className} />;
}

export const RecommendedProducts = Object.assign(Component, {
    displayName: 'Nordcom.Product.RecommendedProducts',
    skeleton: Object.assign(Skeleton, {
        displayName: 'Nordcom.Product.RecommendedProducts.skeleton'
    })
});
