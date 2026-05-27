import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import { unstable_rethrow } from 'next/navigation';
import { Suspense } from 'react';
import type { Product } from '@/api/product';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { RecommendationApi } from '@/api/shopify/recommendation';
import ProductCard from '@/components/product-card/product-card';
import RecommendationProductCard from '@/components/products/recommendation-product-card';
import type { Locale } from '@/utils/locale';
import CollectionBlock from './collection-block';

export type RecommendedProductsProps = {
    shop: OnlineShop;
    locale: Locale;

    product?: Product;
    className?: string;
};
/**
 * Async server component that fetches Shopify product recommendations and renders them as a horizontal collection rail.
 *
 * @param props.shop - Shop record used to instantiate the Shopify API client.
 * @param props.locale - Locale used for the API client.
 * @param props.product - Source product whose recommendations are fetched; renders nothing when absent.
 * @param props.className - Additional CSS class names forwarded to the collection block.
 * @returns The horizontal collection block, or `null` when there is no product or the API call fails.
 */
async function Component({ shop, locale, product, className }: Readonly<RecommendedProductsProps>) {
    if (!product?.id) {
        return null;
    }

    const api = await ShopifyApolloApiClient({ shop, locale });
    let recommended: Awaited<ReturnType<typeof RecommendationApi>>;
    try {
        recommended = await RecommendationApi({ api, id: product.id });
    } catch (error: unknown) {
        unstable_rethrow(error);

        return null;
    }

    return (
        <CollectionBlock shop={shop} locale={locale} className={className} isHorizontal={true}>
            {recommended.map((product) => (
                <Suspense key={product.id} fallback={<ProductCard.skeleton />}>
                    <RecommendationProductCard shop={shop} locale={locale} data={product} priority={false} />
                </Suspense>
            ))}
        </CollectionBlock>
    );
}

/**
 * Skeleton placeholder for `RecommendedProducts` while the async recommendation data loads.
 *
 * @param props.className - Additional CSS class names forwarded to the collection block skeleton.
 * @returns The horizontal collection block skeleton element.
 */
function Skeleton({ className }: { className?: string }) {
    return <CollectionBlock.skeleton isHorizontal={true} className={className} />;
}

export const RecommendedProducts = Object.assign(Component, {
    displayName: 'Nordcom.Product.RecommendedProducts',
    skeleton: Object.assign(Skeleton, {
        displayName: 'Nordcom.Product.RecommendedProducts.skeleton',
    }),
});
