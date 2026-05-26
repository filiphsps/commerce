import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import type { Product } from '@/api/product';
import ProductCard from '@/components/product-card';
import ProductCardActions from '@/components/product-card/primitives/product-card-actions';
import ProductCardBadges from '@/components/product-card/primitives/product-card-badges';
import ProductCardImage from '@/components/product-card/primitives/product-card-image';
import ProductCardOptions from '@/components/product-card/primitives/product-card-options';
import ProductCardPrice from '@/components/product-card/primitives/product-card-price';
import ProductCardStockUrgency from '@/components/product-card/primitives/product-card-stock-urgency';
import ProductCardTitle from '@/components/product-card/primitives/product-card-title';
import { getDictionary } from '@/utils/dictionary';
import { firstAvailableVariant } from '@/utils/first-available-variant';
import type { Locale } from '@/utils/locale';

export type RecommendationProductCardProps = {
    shop: OnlineShop;
    locale: Locale;
    data: Product;
    priority?: boolean;
    className?: string;
};

const RecommendationProductCard = async ({
    shop,
    locale,
    data,
    priority,
    className,
}: RecommendationProductCardProps) => {
    if (!data?.variants?.edges?.[0]?.node) {
        return null;
    }

    const i18n = await getDictionary({ shop, locale });
    const seedVariant = firstAvailableVariant(data) ?? data.variants.edges[0]!.node;

    return (
        <ProductCard
            shop={shop}
            locale={locale}
            data={data}
            layout="vertical"
            chrome="boxed"
            priority={priority}
            className={className}
        >
            <div className="relative">
                <ProductCardImage product={data} seedVariant={seedVariant} priority={priority} aspect="vertical" />
                <ProductCardBadges data={data} i18n={i18n} />
            </div>
            <div className="flex grow flex-col gap-1 pt-1">
                <ProductCardTitle shop={shop} data={data} />
                <ProductCardPrice seedVariant={seedVariant} locale={locale} />
                <ProductCardStockUrgency seedVariant={seedVariant} i18n={i18n} />
                <ProductCardOptions product={data} />
                <ProductCardActions product={data} seedVariant={seedVariant} mode="full" i18n={i18n} />
            </div>
        </ProductCard>
    );
};

RecommendationProductCard.displayName = 'Nordcom.Products.RecommendationProductCard';
export default RecommendationProductCard;
