import 'server-only';

import type { Product } from '@/api/product';
import type { Shop } from '@/api/shop';
import ProductCardActions from '@/components/ProductCard/product-card-actions';
import ProductCardBadges from '@/components/ProductCard/product-card-badges';
import ProductCardImage from '@/components/ProductCard/product-card-image';
import ProductCardTitle from '@/components/ProductCard/product-card-title';
import styles from '@/components/ProductCard/product-card.module.scss';
import { getDictionary } from '@/utils/dictionary';
import type { Locale } from '@/utils/locale';
import { Suspense } from 'react';

export type ProductCardProps = {
    shop: Shop;
    locale: Locale;

    // TODO: Use satisfied.
    data: Product;
    priority?: boolean;

    className?: string;
};
const ProductCard = async ({ shop, locale, data, priority, className, ...props }: ProductCardProps) => {
    const i18n = await getDictionary({ shop, locale });

    return (
        <Suspense key={`${shop.id}.product.${data.handle}.card`} fallback={<ProductCard.skeleton />}>
            <div className={`${styles.container} ${className || ''}`} data-available={data.availableForSale} {...props}>
                <ProductCardImage shop={shop} data={data} priority={priority}>
                    <ProductCardBadges data={data} />
                </ProductCardImage>

                <ProductCardActions data={data} locale={locale} i18n={i18n}>
                    <ProductCardTitle data={data} />
                </ProductCardActions>
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
