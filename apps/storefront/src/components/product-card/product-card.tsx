import 'server-only';

import { Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';

import { type Product } from '@/api/product';
import { getDictionary } from '@/utils/dictionary';
import { cn } from '@/utils/tailwind';

import ProductCardBadges from '@/components/product-card/product-card-badges';
import ProductCardContent from '@/components/product-card/product-card-content';
import ProductCardHeader from '@/components/product-card/product-card-header';
import ProductCardTitle from '@/components/product-card/product-card-title';

import type { Locale } from '@/utils/locale';

const CARD_STYLES = 'group/card relative overflow-hidden rounded-xl p-1 flex flex-col min-h-[18rem] bg-gray-100';

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
                CARD_STYLES,
                'border-2 border-solid border-gray-200 transition-shadow hover:shadow-xl',
                className
            )}
            title={description ? `${description}...` : undefined}
            data-available={product.availableForSale}
            {...props}
        >
            {/*<ProductCardQuickActions data={product} locale={locale} i18n={i18n} />*/}
            <ProductCardBadges data={product} i18n={i18n} />

            <Suspense>
                <ProductCardHeader shop={shop} data={product} priority={priority}>
                    <ProductCardTitle data={product} />
                </ProductCardHeader>
            </Suspense>

            <Suspense>
                <ProductCardContent locale={locale} i18n={i18n} data={product} />
            </Suspense>
        </div>
    );
};
ProductCard.displayName = 'Nordcom.ProductCard';

ProductCard.skeleton = () => <div className={CARD_STYLES} data-skeleton />;
(ProductCard.skeleton as any).displayName = 'Nordcom.ProductCard.Skeleton';

export default ProductCard;
