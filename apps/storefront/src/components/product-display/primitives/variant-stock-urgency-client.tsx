'use client';

import { useMaybeProductOptions } from '@/components/product-options/context';
import type { LocaleDictionary } from '@/utils/locale';
import { getTranslations } from '@/utils/locale';

export type VariantStockUrgencyClientProps = {
    initialMessage: string | null;
    threshold: number;
    i18n: LocaleDictionary;
    className?: string;
};

/**
 * Builds a translated stock-urgency message when the quantity falls within the threshold.
 *
 * @param qty - Current available quantity for the variant.
 * @param threshold - Maximum quantity that triggers the urgency message.
 * @param i18n - Locale dictionary for the translated message string.
 * @returns The formatted urgency string, or `null` when no urgency should be shown.
 */
function buildMessage(qty: number | null | undefined, threshold: number, i18n: LocaleDictionary): string | null {
    if (typeof qty !== 'number' || qty <= 0 || qty > threshold) return null;
    const { t } = getTranslations('product', i18n);
    return t('only-n-left', qty);
}

/**
 * Client component displaying a low-stock urgency message, updating when the selected variant changes.
 * Rendered as a `role="status"` polite live region so a screen reader announces the urgency (and its
 * updated count) when a shopper switches to a low-stock variant.
 *
 * @param props.initialMessage - Pre-computed message rendered before hydration, or `null` when not in stock urgency.
 * @param props.threshold - Quantity ceiling used to recompute the message for the selected variant.
 * @param props.i18n - Locale dictionary for the urgency message translation.
 * @param props.className - Additional CSS class names applied to the urgency span.
 * @returns The urgency message element, or `null` when no message applies.
 */
const VariantStockUrgencyClient = ({ initialMessage, threshold, i18n, className }: VariantStockUrgencyClientProps) => {
    const ctx = useMaybeProductOptions();
    const selectedVariant = ctx?.selectedVariant;
    const message = selectedVariant ? buildMessage(selectedVariant.quantityAvailable, threshold, i18n) : initialMessage;
    if (!message) return null;
    return (
        <span
            role="status"
            className={
                className ??
                'text-(length:--product-card-vendor-size) text-(color:var(--product-card-urgency-color)) inline-flex select-text items-center gap-1 font-semibold'
            }
            data-display="stock-urgency"
        >
            <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-current" />
            {message}
        </span>
    );
};

VariantStockUrgencyClient.displayName = 'Nordcom.ProductDisplay.VariantStockUrgency.Client';
export default VariantStockUrgencyClient;
