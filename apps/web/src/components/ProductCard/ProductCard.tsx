import ProductCardActions from '@/components/ProductCard/product-card-actions';
import ProductCardBadges from '@/components/ProductCard/product-card-badges';
import ProductCardImage from '@/components/ProductCard/product-card-image';
import ProductCardOptions from '@/components/ProductCard/product-card-options';
import ProductCardTitle from '@/components/ProductCard/product-card-title';
import styles from '@/components/ProductCard/product-card.module.scss';
import type { StoreModel } from '@/models/StoreModel';
import { deepEqual } from '@/utils/deep-equal';
import { type LocaleDictionary } from '@/utils/locale';
import type { CSSProperties, FunctionComponent } from 'react';
import { memo } from 'react';

export const AppendShopifyParameters = ({ params, url }: { params?: string | null; url: string }): string => {
    if (!params) return url;

    return `${url}${(url.includes('?') && '&') || '?'}${params}`;
};

interface ProductCardProps {
    store: StoreModel;
    className?: string;
    i18n: LocaleDictionary;
    style?: CSSProperties;
    priority?: boolean;
}
const ProductCard: FunctionComponent<ProductCardProps> = ({ className, i18n, style, priority }) => {
    return (
        <div
            className={`${styles.container} ${className || ''}`}
            //data-available={!!selectedVariant.availableForSale}
            style={style}
        >
            <div className={styles['image-container']}>
                <ProductCardImage priority={priority} />
                <ProductCardBadges i18n={i18n} />
            </div>

            <div className={styles.details}>
                <ProductCardTitle />
                <ProductCardOptions i18n={i18n} />
            </div>

            <ProductCardActions i18n={i18n} />
        </div>
    );
};

export const ProductCardSkeleton = () => {
    return (
        <div className={`${styles.container} ${styles.skeleton}`}>
            <div className={styles.image}></div>
            <div></div>
            <div></div>
        </div>
    );
};

export default memo(ProductCard, deepEqual);
