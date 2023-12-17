import type { Product } from '@/api/product';
import ProductCardActions from '@/components/ProductCard/product-card-actions';
import ProductCardBadges from '@/components/ProductCard/product-card-badges';
import ProductCardImage from '@/components/ProductCard/product-card-image';
import ProductCardOptions from '@/components/ProductCard/product-card-options';
import ProductCardTitle from '@/components/ProductCard/product-card-title';
import styles from '@/components/ProductCard/product-card.module.scss';
import { deepEqual } from '@/utils/deep-equal';
import { type LocaleDictionary } from '@/utils/locale';
import { memo } from 'react';

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
        <div className={`${styles.container} ${className || ''}`} data-available={data.availableForSale}>
            <div className={styles['image-container']}>
                <ProductCardImage priority={priority} />
                <ProductCardBadges i18n={i18n} />
            </div>

            <div className={styles.details}>
                <ProductCardTitle data={data} />
                <ProductCardOptions i18n={i18n} />
            </div>

            <ProductCardActions i18n={i18n} />
        </div>
    );
}, deepEqual);

export const ProductCardSkeleton = () => {
    return (
        <div className={`${styles.container} ${styles.skeleton}`}>
            <div className={styles.image}></div>
            <div></div>
            <div></div>
        </div>
    );
};

ProductCard.displayName = 'Nordcom.ProductCard';
export default ProductCard;
