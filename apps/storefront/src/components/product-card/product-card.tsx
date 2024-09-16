import 'server-only';

import { Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';

import { type Product } from '@/api/product';
import { getDictionary } from '@/utils/dictionary';
import { cn } from '@/utils/tailwind';

import ProductCardBadges from '@/components/product-card/product-card-badges';
import ProductCardContent from '@/components/product-card/product-card-content';
import ProductCardTitle from '@/components/product-card/product-card-title';

import type { Locale } from '@/utils/locale';

export const CARD_STYLES =
    'group/card relative flex min-h-[20rem] flex-col overflow-hidden rounded-xl border-2 border-solid border-gray-200 bg-gray-100 p-1 transition-shadow hover:shadow-xl w-full';

const DESCRIPTION_LENGTH = 160;

export type ProductCardProps = {
    shop: OnlineShop;
    locale: Locale;

    // TODO: Use satisfied.
    data?: Product;
    priority?: boolean;
    className?: string;
};
const ProductCard = async ({ shop, locale, data: product, priority, className, ...props }: ProductCardProps) => {
    if (!product) {
        return null;
    }

    const i18n = await getDictionary({ shop, locale });

    const description = (product.seo.description || product.description || '').slice(0, DESCRIPTION_LENGTH).trimEnd();
    const available = product.availableForSale;
    const isFreeShipping = available && product.tags.includes('Free Shipping');

    return (
        <div
            className={cn(
                CARD_STYLES,
                'transition-shadow hover:drop-shadow',
                isFreeShipping && 'border-primary shadow',
                className
            )}
            title={available ? `${description}...` : ''}
            {...props}
        >
            <ProductCardBadges data={product} i18n={i18n} />

            <Suspense>
                <ProductCardContent locale={locale} i18n={i18n} data={product} priority={priority}>
                    <ProductCardTitle shop={shop} data={product} />
                </ProductCardContent>
            </Suspense>
        </div>
    );
};
ProductCard.displayName = 'Nordcom.ProductCard';

ProductCard.skeleton = () => <div className={CARD_STYLES} data-skeleton />;
(ProductCard.skeleton as any).displayName = 'Nordcom.ProductCard.Skeleton';

export default ProductCard;
