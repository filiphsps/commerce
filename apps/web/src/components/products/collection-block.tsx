/* eslint-disable unused-imports/no-unused-vars */
import type { Product } from '@/api/product';
import { ProductCardSkeleton } from '@/components/ProductCard';
import Link from '@/components/link';
import styles from '@/components/products/collection-block.module.scss';
import type { StoreModel } from '@/models/StoreModel';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import type { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import { Suspense, type HTMLProps } from 'react';
import { CollectionBlockContent } from './collection-block-content';

export type CollectionBlockCommonProps = {
    isHorizontal?: boolean;
} & HTMLProps<HTMLDivElement>;

export type CollectionBlockProps = {
    locale: Locale;
    i18n: LocaleDictionary;
    store: StoreModel;
    data: Collection;
    limit?: number;
    showViewAll?: boolean;
} & CollectionBlockCommonProps &
    HTMLProps<HTMLDivElement>;
export const CollectionBlock = ({
    data: collection,
    limit,
    isHorizontal,
    showViewAll,
    store,
    locale,
    i18n,
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
                <Suspense
                    fallback={
                        <>
                            {[...Array(7).keys()].map((i) => (
                                <ProductCardSkeleton key={i} />
                            ))}
                        </>
                    }
                >
                    <CollectionBlockContent locale={locale} i18n={i18n} products={products} store={store} />
                </Suspense>

                {showViewAll ? (
                    <Link
                        href={`/collections/${collection.handle}/`}
                        className={styles.viewAll}
                        locale={locale}
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

export const CollectionBlockSkeleton = ({ isHorizontal }: CollectionBlockCommonProps) => {
    return (
        <section className={`${styles.container}${isHorizontal ? ` ${styles.horizontal}` : ''} ${styles.skeleton}`}>
            <div className={styles.content}>
                {[...Array(7).keys()].map((i) => (
                    <ProductCardSkeleton key={i} />
                ))}
            </div>
        </section>
    );
};
