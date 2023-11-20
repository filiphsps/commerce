/* eslint-disable unused-imports/no-unused-vars */
import { ProductCardSkeleton } from '@/components/ProductCard';
import styles from '@/components/products/collection-block.module.scss';
import type { StoreModel } from '@/models/StoreModel';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import type { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import type { HTMLProps } from 'react';

export type CollectionBlockCommonProps = {
    isHorizontal?: boolean;
} & HTMLProps<HTMLDivElement>;

export type CollectionBlockProps = {
    locale: Locale;
    i18n: LocaleDictionary;
    store: StoreModel;
    data?: Collection;
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
    return (
        <section
            {...props}
            className={`${styles.container}${className ? ` ${className}` : ''}${
                isHorizontal ? ` ${styles.horizontal}` : ''
            }`}
        ></section>
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
