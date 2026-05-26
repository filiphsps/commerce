import type { ProductVariant } from '@/api/product';
import type { LocaleDictionary } from '@/utils/locale';
import { getTranslations } from '@/utils/locale';
import VariantStockUrgencyClient from './variant-stock-urgency-client';

export type VariantStockUrgencyProps = {
    seedVariant: ProductVariant;
    threshold?: number;
    i18n: LocaleDictionary;
    className?: string;
};

const VariantStockUrgency = ({ seedVariant, threshold = 5, i18n, className }: VariantStockUrgencyProps) => {
    const qty = seedVariant.quantityAvailable;
    let initialMessage: string | null = null;
    if (typeof qty === 'number' && qty > 0 && qty <= threshold) {
        const { t } = getTranslations('product', i18n);
        initialMessage = t('only-n-left', qty);
    }
    return (
        <VariantStockUrgencyClient
            initialMessage={initialMessage}
            threshold={threshold}
            i18n={i18n}
            className={className}
        />
    );
};

VariantStockUrgency.displayName = 'Nordcom.ProductDisplay.VariantStockUrgency';
export default VariantStockUrgency;
