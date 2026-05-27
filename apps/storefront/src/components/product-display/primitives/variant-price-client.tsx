'use client';

import { useMaybeProductOptions } from '@/components/product-options/context';
import { formatPrice } from '@/utils/format-price';
import { computeSalePercent } from '@/utils/sale-percent';

export type VariantPriceClientProps = {
    initialPrice: string;
    initialCompare: string | null;
    initialPct: number | null;
    locale: string;
    className?: string;
};

/**
 * Client component displaying the price, compare-at price, and sale percentage for the selected variant.
 *
 * @param props.initialPrice - Pre-formatted price string rendered before hydration.
 * @param props.initialCompare - Pre-formatted compare-at price, or `null` when not on sale.
 * @param props.initialPct - Pre-computed sale percentage, or `null` when not on sale.
 * @param props.locale - Locale code for number and currency formatting.
 * @param props.className - Additional CSS class names.
 * @returns The price display element.
 */
const VariantPriceClient = ({
    initialPrice,
    initialCompare,
    initialPct,
    locale,
    className,
}: VariantPriceClientProps) => {
    const ctx = useMaybeProductOptions();
    const selectedVariant = ctx?.selectedVariant;
    const price = selectedVariant?.price ? formatPrice(selectedVariant.price, locale) : initialPrice;
    const compare = selectedVariant?.compareAtPrice
        ? formatPrice(selectedVariant.compareAtPrice, locale)
        : selectedVariant
          ? null
          : initialCompare;
    const pct = selectedVariant ? computeSalePercent(selectedVariant) : initialPct;

    return (
        <span className={className} data-display="price">
            <span
                data-display-price
                className="text-(length:--product-card-price-size) font-(weight:--product-card-price-weight) text-(color:var(--product-card-price-color)) select-text tabular-nums"
            >
                {price}
            </span>
            {compare ? (
                <span
                    data-display-compare
                    className="text-(length:--product-card-vendor-size) text-(color:var(--product-card-compare-color)) ml-2 select-text tabular-nums line-through"
                >
                    {compare}
                </span>
            ) : null}
            {pct ? (
                <span
                    data-display-pct
                    className="text-(length:--product-card-vendor-size) text-(color:var(--product-card-urgency-color)) ml-2 inline-block select-text rounded bg-[color-mix(in_srgb,var(--product-card-urgency-color)_10%,transparent)] px-1.5 py-0.5 font-bold"
                >
                    {pct}%
                </span>
            ) : null}
        </span>
    );
};

VariantPriceClient.displayName = 'Nordcom.ProductDisplay.VariantPrice.Client';
export default VariantPriceClient;
