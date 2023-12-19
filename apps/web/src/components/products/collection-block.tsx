import 'server-only';

import type { Product } from '@/api/product';
import type { Shop } from '@/api/shop';
import { ShopifyApiConfig, ShopifyApolloApiClient } from '@/api/shopify';
import { CollectionApi } from '@/api/shopify/collection';
import ProductCard from '@/components/ProductCard';
import Link from '@/components/link';
import styles from '@/components/products/collection-block.module.scss';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { type HTMLProps } from 'react';

export type CollectionBlockCommonProps = {
    isHorizontal?: boolean;
} & HTMLProps<HTMLDivElement>;

export type CollectionBlockProps = {
    shop: Shop;
    locale: Locale;
    i18n: LocaleDictionary;

    handle: string;

    limit?: number;
    showViewAll?: boolean;
    priority?: boolean;
} & CollectionBlockCommonProps &
    HTMLProps<HTMLDivElement>;
const CollectionBlock = async ({
    shop,
    locale,
    handle,
    limit,
    isHorizontal,
    showViewAll,
    i18n,
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
        limit
    });

    // TODO: Add collection type.
    const products: Product[] = collection?.products?.edges?.map(({ node }) => node as any) || [];
    if (!collection || !products || products.length <= 0) return null;

    return (
        <section
            {...props}
            className={`${styles.container} ${isHorizontal ? styles.horizontal : ''} ${className ? className : ''}`}
        >
            <div className={styles.content}>
                {products.map((product, index) => (
                    <ProductCard key={product.id} i18n={i18n} data={product} priority={priority && index < 2} />
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
