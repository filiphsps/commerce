import type { Product } from '@/api/product';
import ProductCardBody from '@/components/ProductCard/product-card-body';
import ProductCardTitle from '@/components/ProductCard/product-card-title';
import styles from '@/components/ProductCard/product-card.module.scss';
import { deepEqual } from '@/utils/deep-equal';
import { type LocaleDictionary } from '@/utils/locale';
import { Suspense, memo } from 'react';

export const AppendShopifyParameters = ({ params, url }: { params?: string | null; url: string }): string => {
    if (!params) return url;

    return `${url}${(url.includes('?') && '&') || '?'}${params}`;
};

export type ProductCardProps = {
    className?: string;
    i18n: LocaleDictionary;
    data: Product; // TODO: This is only a subset of the data is passed to the ProductCard.
    priority?: boolean;
};
const ProductCard = memo(({ className, i18n, data, priority }: ProductCardProps) => {
    return (
        <Suspense fallback={<ProductCardSkeleton />}>
            <div className={`${styles.container} ${className || ''}`} data-available={data.availableForSale}>
                <ProductCardBody data={data} i18n={i18n} priority={priority}>
                    <ProductCardTitle data={data} />
                </ProductCardBody>
            </div>
        </Suspense>
    );
}, deepEqual);

ProductCard.displayName = 'Nordcom.ProductCard';
export default ProductCard;

export const ProductCardSkeleton = () => {
    return (
        <div className={`${styles.container} ${styles.skeleton}`}>
            <div className={styles.image}></div>
            <div></div>
            <div></div>
        </div>
    );
};
