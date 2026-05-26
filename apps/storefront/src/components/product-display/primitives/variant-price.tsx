import type { ProductVariant } from '@/api/product';
import { formatPrice } from '@/utils/format-price';
import { computeSalePercent } from '@/utils/sale-percent';
import VariantPriceClient from './variant-price-client';

export type VariantPriceProps = {
    seedVariant: ProductVariant;
    locale: string;
    className?: string;
};

const VariantPrice = ({ seedVariant, locale, className }: VariantPriceProps) => {
    const initialPrice = formatPrice(seedVariant.price, locale);
    const initialCompare = seedVariant.compareAtPrice ? formatPrice(seedVariant.compareAtPrice, locale) : null;
    const initialPct = computeSalePercent(seedVariant);
    return (
        <VariantPriceClient
            initialPrice={initialPrice}
            initialCompare={initialCompare}
            initialPct={initialPct}
            locale={locale}
            className={className}
        />
    );
};

VariantPrice.displayName = 'Nordcom.ProductDisplay.VariantPrice';
export default VariantPrice;
