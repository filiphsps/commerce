import 'server-only';

import styles from '@/components/product-card/product-card.module.scss';

import type { OnlineShop } from '@nordcom/commerce-db';

import { getDictionary } from '@/utils/dictionary';
import { cn } from '@/utils/tailwind';

import ProductCardBadges from '@/components/product-card/product-card-badges';
import ProductCardFooter from '@/components/product-card/product-card-footer';
import ProductCardHeader from '@/components/product-card/product-card-header';
import ProductCardTitle from '@/components/product-card/product-card-title';

import type { Product } from '@/api/product';
import type { Locale } from '@/utils/locale';

const DESCRIPTION_LENGTH = 160;

export type ProductCardProps = {
    shop: OnlineShop;
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
        <div
            className={cn(
                styles.container,
                'overflow-hidden rounded-xl border-2 border-solid border-gray-300 bg-gray-100 p-1 transition-shadow hover:shadow-xl md:p-2 2xl:max-w-56',
                className
            )}
            title={description ? `${description}...` : undefined}
            data-available={product.availableForSale}
            {...props}
        >
            {/*<ProductCardQuickActions data={product} locale={locale} i18n={i18n} />*/}
            <ProductCardBadges data={product} i18n={i18n} />

            <ProductCardHeader shop={shop} data={product} priority={priority}>
                <ProductCardTitle data={product} />
            </ProductCardHeader>

            <ProductCardFooter data={product} locale={locale} i18n={i18n} />
        </div>
    );
};
ProductCard.displayName = 'Nordcom.ProductCard';

ProductCard.skeleton = () => <div className={styles.container} data-skeleton />;
(ProductCard.skeleton as any).displayName = 'Nordcom.ProductCard.Skeleton';

export default ProductCard;
