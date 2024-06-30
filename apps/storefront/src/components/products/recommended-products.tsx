/* eslint-disable react-hooks/rules-of-hooks */
import 'server-only';

import styles from '@/components/products/collection-block.module.scss';
import extraStyles from '@/components/products/recommended-products.module.scss';

import type { Shop } from '@nordcom/commerce-database';

import { ShopifyApolloApiClient } from '@/api/shopify';
import { RecommendationApi } from '@/api/shopify/recommendation';
import { getDictionary } from '@/utils/dictionary';
import { type Locale, useTranslation } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

import ProductCard from '@/components/product-card/product-card';

import type { Product } from '@/api/product';

export type RecommendedProductsProps = {
    shop: Shop;
    locale: Locale;

    product?: Product;
    className?: string;
};
const RecommendedProducts = async ({ shop, locale, product, className }: RecommendedProductsProps) => {
    if (!product) return null;

    const api = await ShopifyApolloApiClient({ shop, locale });

    const recommended = await RecommendationApi({ api, id: product.id });
    const i18n = await getDictionary({ shop, locale });
    const { t } = useTranslation('product', i18n);

    return (
        <div className={cn(styles.container, styles.content, styles.horizontal, extraStyles.container, className)}>
            {recommended.map((product) => (
                <ProductCard key={product.id} shop={shop} locale={locale} data={product} className={extraStyles.card} />
            ))}
        </div>
    );
};
RecommendedProducts.displayName = 'Nordcom.Products.RecommendedProducts';

RecommendedProducts.skeleton = () => {
    return <section className={`${styles.container} ${styles.horizontal} ${extraStyles.container}`} />;
};
(RecommendedProducts.skeleton as any).displayName = 'Nordcom.Products.RecommendedProducts.Skeleton';

export { RecommendedProducts };
