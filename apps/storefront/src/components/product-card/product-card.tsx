import 'server-only';

import styles from '@/components/product-card/product-card.module.scss';

import { Suspense } from 'react';

import type { Shop } from '@nordcom/commerce-database';

import { getDictionary } from '@/utils/dictionary';

import ProductCardActions from '@/components/product-card/product-card-actions';
import ProductCardBadges from '@/components/product-card/product-card-badges';
import ProductCardImage from '@/components/product-card/product-card-image';
import ProductCardTitle from '@/components/product-card/product-card-title';

import type { Product } from '@/api/product';
import type { Locale } from '@/utils/locale';

const DESCRIPTION_LENGTH = 160;

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

    const description = (data.seo.description || data.description || '').slice(0, DESCRIPTION_LENGTH).trimEnd();

    return (
        <Suspense key={`${shop.id}.product.${data.handle}.card`} fallback={<ProductCard.skeleton />}>
            <div
                className={`${styles.container} ${className || ''}`}
                data-available={data.availableForSale}
                title={description ? `${description}...` : undefined}
                {...props}
            >
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
ProductCard.displayName = 'Nordcom.ProductCard';

ProductCard.skeleton = () => (
    <div className={styles.container} data-skeleton>
        <div className={styles.image}></div>
        <div></div>
        <div></div>
    </div>
);
(ProductCard.skeleton as any).displayName = 'Nordcom.ProductCard.skeleton';

export default ProductCard;
