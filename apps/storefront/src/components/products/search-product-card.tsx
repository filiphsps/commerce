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

export type SearchProductCardProps = {
    shop: OnlineShop;
    locale: Locale;
    data: Product;
    priority?: boolean;
    className?: string;
};

const SearchProductCard = async ({ shop, locale, data, priority, className }: SearchProductCardProps) => {
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
            layout="horizontal"
            chrome="bare"
            priority={priority}
            className={className}
        >
            <div className="relative w-20 shrink-0">
                <ProductCardImage product={data} seedVariant={seedVariant} priority={priority} aspect="horizontal" />
                <ProductCardBadges data={data} i18n={i18n} />
            </div>
            <div className="flex min-w-0 grow flex-col gap-1">
                <ProductCardTitle shop={shop} data={data} />
                <ProductCardStockUrgency seedVariant={seedVariant} i18n={i18n} />
                <ProductCardOptions product={data} />
            </div>
            <div className="flex shrink-0 flex-col items-end justify-between gap-2">
                <ProductCardPrice seedVariant={seedVariant} locale={locale} />
                <ProductCardActions product={data} seedVariant={seedVariant} mode="icon" i18n={i18n} />
            </div>
        </ProductCard>
    );
};

SearchProductCard.displayName = 'Nordcom.Products.SearchProductCard';
export default SearchProductCard;
