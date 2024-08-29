import 'server-only';

import styles from '@/components/products/collection-block.module.scss';
import overflowStyles from '@/styles/horizontal-overflow-scroll.module.scss';

import { type HTMLProps, Suspense } from 'react';

import { type OnlineShop } from '@nordcom/commerce-db';

import { ShopifyApolloApiClient } from '@/api/shopify';
import { CollectionApi } from '@/api/shopify/collection';
import { cn } from '@/utils/tailwind';
import { unstable_cache as cache } from 'next/cache';

import Link from '@/components/link';
import ProductCard from '@/components/product-card/product-card';

import type { Product } from '@/api/product';
import type { Locale } from '@/utils/locale';

export type CollectionBlockCommonProps = {
    isHorizontal?: boolean;
} & HTMLProps<HTMLDivElement>;

export type CollectionBlockProps = {
    shop: OnlineShop;
    locale: Locale;

    handle: string;

    limit?: number;
    filters?: any;
    showViewAll?: boolean;
    priority?: boolean;
} & CollectionBlockCommonProps &
    HTMLProps<HTMLDivElement>;
const CollectionBlock = async ({
    shop,
    locale,
    handle,
    limit,
    filters,
    isHorizontal,
    showViewAll,
    priority,
    className,
    ...props
}: CollectionBlockProps) => {
    const api = await ShopifyApolloApiClient({ shop, locale });

    const collection = await CollectionApi(
        {
            api,
            handle,
            // TODO: Pagination for the full variation.
            first: limit,
            ...filters
        },
        cache
    );

    // TODO: Add collection type.
    const products: Product[] = (collection as any)?.products?.edges?.map(({ node }: any) => node as any) || [];
    if (products.length <= 0) {
        return null;
    }

    return (
        <section
            {...props}
            className={cn(
                styles.container,
                isHorizontal && `${styles.horizontal} ${overflowStyles.container}`,
                className
            )}
        >
            <div className={styles.content}>
                {products.map((product, index) => (
                    <Suspense key={product.id} fallback={<ProductCard.skeleton />}>
                        <ProductCard shop={shop} locale={locale} data={product} priority={priority && index < 2} />
                    </Suspense>
                ))}

                {showViewAll ? (
                    <Link
                        href={`/collections/${collection.handle}/`}
                        className={styles.viewAll}
                        // TODO: i18n.
                        // TODO: View all {products.length} {Pluralize({ count: products.length, noun: 'product' })}.
                    >
                        <div className="text-center">
                            View all of the products in <b className="font-bold">{collection.title}</b>.
                        </div>
                    </Link>
                ) : null}
            </div>
        </section>
    );
};
CollectionBlock.displayName = 'Nordcom.Products.CollectionBlock';

CollectionBlock.skeleton = ({ isHorizontal }: Pick<CollectionBlockProps, 'isHorizontal'>) => (
    <section className={cn(styles.container, isHorizontal && styles.horizontal)}>
        <div className={styles.content}>
            <ProductCard.skeleton />
            <ProductCard.skeleton />
            <ProductCard.skeleton />
            <ProductCard.skeleton />
            <ProductCard.skeleton />
            <ProductCard.skeleton />
        </div>
    </section>
);

CollectionBlock.displayName = 'Nordcom.Products.CollectionBlock';
export default CollectionBlock;
