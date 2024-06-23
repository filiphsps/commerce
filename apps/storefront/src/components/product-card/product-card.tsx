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
const ProductCard = async ({ shop, locale, data: product, priority, className, ...props }: ProductCardProps) => {
    const i18n = await getDictionary({ shop, locale });
    const description = (product.seo.description || product.description || '').slice(0, DESCRIPTION_LENGTH).trimEnd();

    return (
        <Suspense fallback={<ProductCard.skeleton />}>
            <div
                className={`${styles.container} ${className || ''}`}
                title={description ? `${description}...` : undefined}
                data-available={product.availableForSale}
                {...props}
            >
                {/*<ProductCardQuickActions data={product} locale={locale} i18n={i18n} />*/}
                <ProductCardImage shop={shop} data={product} priority={priority}>
                    <ProductCardBadges data={product} />
                </ProductCardImage>

                <ProductCardActions data={product} locale={locale} i18n={i18n}>
                    <ProductCardTitle data={product} />
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
(ProductCard.skeleton as any).displayName = 'Nordcom.ProductCard.Skeleton';

export default ProductCard;
