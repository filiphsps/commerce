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

function buildMessage(qty: number | null | undefined, threshold: number, i18n: LocaleDictionary): string | null {
    if (typeof qty !== 'number' || qty <= 0 || qty > threshold) return null;
    const { t } = getTranslations('product', i18n);
    return t('only-n-left', qty);
}

const VariantStockUrgencyClient = ({ initialMessage, threshold, i18n, className }: VariantStockUrgencyClientProps) => {
    const ctx = useMaybeProductOptions();
    const selectedVariant = ctx?.selectedVariant;
    const message = selectedVariant ? buildMessage(selectedVariant.quantityAvailable, threshold, i18n) : initialMessage;
    if (!message) return null;
    return (
        <span
            className={
                className ??
                'text-(length:--product-card-vendor-size) text-(color:var(--product-card-urgency-color)) inline-flex items-center gap-1 font-semibold'
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
