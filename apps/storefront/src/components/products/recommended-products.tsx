/* eslint-disable react-hooks/rules-of-hooks */
import 'server-only';

import styles from '@/components/products/collection-block.module.scss';
import extraStyles from '@/components/products/recommended-products.module.scss';

import type { Shop } from '@nordcom/commerce-database';

import { ShopifyApiConfig, ShopifyApolloApiClient } from '@/api/shopify';
import { RecommendationApi } from '@/api/shopify/recommendation';
import { getDictionary } from '@/utils/dictionary';
import { type Locale, useTranslation } from '@/utils/locale';

import ProductCard from '@/components/product-card/product-card';
import Heading from '@/components/typography/heading';

import type { Product } from '@/api/product';

export type RecommendedProductsProps = {
    shop: Shop;
    locale: Locale;

    product?: Product;
};
const RecommendedProducts = async ({ shop, locale, product }: RecommendedProductsProps) => {
    if (!product) return null;

    const apiConfig = await ShopifyApiConfig({ shop });
    const api = await ShopifyApolloApiClient({ shop, locale, apiConfig });

    const recommended = await RecommendationApi({ api, id: product.id });
    const i18n = await getDictionary({ shop, locale });
    const { t } = useTranslation('product', i18n);

    return (
        <section className={`${styles.container} ${styles.horizontal} ${extraStyles.container}`}>
            <Heading title={t('recommendations')} titleAs={'h3'} />

            <div className={styles.content}>
                {recommended.map((product) => (
                    <ProductCard key={product.id} shop={shop} locale={locale} data={product} />
                ))}
            </div>
        </section>
    );
};
RecommendedProducts.displayName = 'Nordcom.Products.RecommendedProducts';

RecommendedProducts.skeleton = () => {
    return <section className={`${styles.container} ${styles.horizontal} ${extraStyles.container}`} />;
};
(RecommendedProducts.skeleton as any).displayName = 'Nordcom.Products.RecommendedProducts.Skeleton';

export { RecommendedProducts };
