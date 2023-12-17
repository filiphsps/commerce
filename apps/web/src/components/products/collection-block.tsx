import type { Product } from '@/api/product';
import ProductCard from '@/components/ProductCard';
import Link from '@/components/link';
import styles from '@/components/products/collection-block.module.scss';
import { deepEqual } from '@/utils/deep-equal';
import type { LocaleDictionary } from '@/utils/locale';
import type { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import { memo, type HTMLProps } from 'react';

export type CollectionBlockCommonProps = {
    isHorizontal?: boolean;
} & HTMLProps<HTMLDivElement>;

export type CollectionBlockProps = {
    i18n: LocaleDictionary;
    data: Collection;
    showViewAll?: boolean;
    priority?: boolean;

    /** @todo TODO: Limit. */
    limit?: number;
} & CollectionBlockCommonProps &
    HTMLProps<HTMLDivElement>;
const CollectionBlock = memo(
    ({ data: collection, isHorizontal, showViewAll, i18n, priority, className, ...props }: CollectionBlockProps) => {
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
    },
    deepEqual
);

CollectionBlock.displayName = 'Nordcom.Products.CollectionBlock';
export default CollectionBlock;

export const CollectionBlockSkeleton = ({ isHorizontal, children }: CollectionBlockCommonProps) => {
    return (
        <section className={`${styles.container}${isHorizontal ? ` ${styles.horizontal}` : ''} ${styles.skeleton}`}>
            <div className={styles.content}>{children}</div>
        </section>
    );
};
