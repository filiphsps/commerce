/* eslint-disable unused-imports/no-unused-vars */
import type { Product } from '@/api/product';
import ProductCard, { ProductCardSkeleton } from '@/components/ProductCard';
import Link from '@/components/link';
import styles from '@/components/products/collection-block.module.scss';
import { ProductWrapper } from '@/components/products/product-wrapper';
import type { StoreModel } from '@/models/StoreModel';
import { deepEqual } from '@/utils/deep-equal';
import type { LocaleDictionary } from '@/utils/locale';
import type { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import { memo, type HTMLProps } from 'react';

export type CollectionBlockCommonProps = {
    isHorizontal?: boolean;
} & HTMLProps<HTMLDivElement>;

export type CollectionBlockProps = {
    i18n: LocaleDictionary;
    store: StoreModel;
    data: Collection;
    limit?: number;
    showViewAll?: boolean;
    priority?: boolean;
} & CollectionBlockCommonProps &
    HTMLProps<HTMLDivElement>;
const CollectionBlock = memo(
    ({
        data: collection,
        limit,
        isHorizontal,
        showViewAll,
        store,
        i18n,
        priority,
        className,
        ...props
    }: CollectionBlockProps) => {
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
                        <ProductWrapper key={product.id} product={product}>
                            <ProductCard i18n={i18n} data={product} priority={priority && index < 2} />
                        </ProductWrapper>
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
    },
    deepEqual
);

CollectionBlock.displayName = 'Nordcom.Products.CollectionBlock';
export default CollectionBlock;

export const CollectionBlockSkeleton = ({ isHorizontal }: CollectionBlockCommonProps) => {
    return (
        <section className={`${styles.container}${isHorizontal ? ` ${styles.horizontal}` : ''} ${styles.skeleton}`}>
            <div className={styles.content}>{fallback}</div>
        </section>
    );
};

const fallback = [...Array(7).keys()].map((i) => <ProductCardSkeleton key={i} />);
