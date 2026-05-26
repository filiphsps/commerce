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

export type VerticalBareProps = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
    product: Product;
    seedVariant: ProductVariant;
    priority: boolean;
    aspect: 'vertical' | 'horizontal' | 'micro';
};

const VerticalBare = ({ shop, locale, i18n, product, seedVariant, priority, aspect }: VerticalBareProps) => (
    <>
        <div className="relative">
            <ProductCardImage product={product} seedVariant={seedVariant} priority={priority} aspect={aspect} />
            <ProductCardBadges data={product} i18n={i18n} />
        </div>
        <div className="flex grow flex-col gap-1 pt-2">
            <ProductCardTitle shop={shop} data={product} />
            <ProductCardPrice seedVariant={seedVariant} locale={locale} />
            <ProductCardStockUrgency seedVariant={seedVariant} i18n={i18n} />
            <ProductCardOptions product={product} />
            <ProductCardActions i18n={i18n} mode="full" />
        </div>
    </>
);

VerticalBare.displayName = 'Nordcom.ProductCard.Variant.VerticalBare';
export default VerticalBare;
