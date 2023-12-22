import 'server-only';

import type { Product } from '@/api/product';
import type { Shop } from '@/api/shop';
import ProductCardBody from '@/components/ProductCard/product-card-body';
import ProductCardTitle from '@/components/ProductCard/product-card-title';
import styles from '@/components/ProductCard/product-card.module.scss';
import { type LocaleDictionary } from '@/utils/locale';
import { Suspense } from 'react';

export type ProductCardProps = {
    shop: Shop;
    i18n: LocaleDictionary;

    // TODO: Use satisfied.
    data: Product;
    priority?: boolean;

    className?: string;
};
const ProductCard = ({ shop, i18n, data, priority, className, ...props }: ProductCardProps) => {
    return (
        <Suspense key={`${shop.id}.product.${data.handle}.card`} fallback={<ProductCard.skeleton />}>
            <div className={`${styles.container} ${className || ''}`} data-available={data.availableForSale} {...props}>
                <ProductCardBody data={data} i18n={i18n} priority={priority}>
                    <ProductCardTitle data={data} />
                </ProductCardBody>
            </div>
        </Suspense>
    );
};

ProductCard.skeleton = () => (
    <div className={styles.container} data-skeleton>
        <div className={styles.image}></div>
        <div></div>
        <div></div>
    </div>
);

ProductCard.displayName = 'Nordcom.ProductCard';
export default ProductCard;
