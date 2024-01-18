import 'server-only';

import type { Product } from '@/api/product';
import { ShopifyApiConfig, ShopifyApolloApiClient } from '@/api/shopify';
import { CollectionApi } from '@/api/shopify/collection';
import Link from '@/components/link';
import ProductCard from '@/components/product-card/product-card';
import styles from '@/components/products/collection-block.module.scss';
import type { Locale } from '@/utils/locale';
import type { Shop } from '@nordcom/commerce-database';
import type { HTMLProps } from 'react';

export type CollectionBlockCommonProps = {
    isHorizontal?: boolean;
} & HTMLProps<HTMLDivElement>;

export type CollectionBlockProps = {
    shop: Shop;
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
    const apiConfig = await ShopifyApiConfig({ shop });
    const api = await ShopifyApolloApiClient({ shop, locale, apiConfig });

    const collection = await CollectionApi({
        api,
        handle,
        // TODO: Pagination for the full variation.
        first: limit,
        ...filters
    });

    // TODO: Add collection type.
    const products: Product[] = collection?.products?.edges?.map(({ node }) => node as any) || [];
    if (!collection || !products || products.length <= 0) return null;

    return (
        <section
            {...props}
            className={`${styles.container} ${isHorizontal ? styles.horizontal : styles.vertical} ${
                className ? className : ''
            }`}
        >
            <div className={styles.content}>
                {products.map((product, index) => (
                    <ProductCard
                        key={product.id}
                        shop={shop}
                        locale={locale}
                        data={product}
                        priority={priority && index < 2}
                    />
                ))}

                {showViewAll ? (
                    <Link
                        href={`/collections/${collection.handle}/`}
                        className={styles.viewAll}
                        title="Browse all products" // TODO: i18n.
                        // TODO: View all {products.length} {Pluralize({ count: products.length, noun: 'product' })}.
                    >
                        View all of the products in this collection
                    </Link>
                ) : null}
            </div>
        </section>
    );
};

CollectionBlock.skeleton = ({ isHorizontal }: Pick<CollectionBlockProps, 'isHorizontal'>) => (
    <section className={`${styles.container}${isHorizontal ? ` ${styles.horizontal}` : ''}`} data-skeleton>
        <div className={styles.content}>
            <ProductCard.skeleton />
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
