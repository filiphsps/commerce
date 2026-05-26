import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import type { Product, ProductVariant } from '@/api/product';
import ProductCardActions from '@/components/product-card/primitives/product-card-actions';
import ProductCardBadges from '@/components/product-card/primitives/product-card-badges';
import ProductCardImage from '@/components/product-card/primitives/product-card-image';
import ProductCardOptions from '@/components/product-card/primitives/product-card-options';
import ProductCardPrice from '@/components/product-card/primitives/product-card-price';
import ProductCardStockUrgency from '@/components/product-card/primitives/product-card-stock-urgency';
import ProductCardTitle from '@/components/product-card/primitives/product-card-title';
import type { Locale, LocaleDictionary } from '@/utils/locale';

export type HorizontalBoxedProps = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
    product: Product;
    seedVariant: ProductVariant;
    priority: boolean;
    aspect: 'vertical' | 'horizontal' | 'micro';
};

const HorizontalBoxed = ({ shop, locale, i18n, product, seedVariant, priority, aspect }: HorizontalBoxedProps) => (
    <>
        <div className="relative w-24 shrink-0">
            <ProductCardImage product={product} seedVariant={seedVariant} priority={priority} aspect={aspect} />
            <ProductCardBadges data={product} i18n={i18n} />
        </div>
        <div className="flex min-w-0 grow flex-col gap-1">
            <ProductCardTitle shop={shop} data={product} />
            <ProductCardStockUrgency seedVariant={seedVariant} i18n={i18n} />
            <ProductCardOptions product={product} />
        </div>
        <div className="flex shrink-0 flex-col items-end justify-between gap-2 py-1">
            <ProductCardPrice seedVariant={seedVariant} locale={locale} />
            <ProductCardActions i18n={i18n} mode="icon" />
        </div>
    </>
);

HorizontalBoxed.displayName = 'Nordcom.ProductCard.Variant.HorizontalBoxed';
export default HorizontalBoxed;
