import type { ProductVariant } from '@/api/product';
import { VariantStockUrgency } from '@/components/product-display';
import type { LocaleDictionary } from '@/utils/locale';

export type ProductCardStockUrgencyProps = {
    seedVariant: ProductVariant;
    i18n: LocaleDictionary;
    threshold?: number;
    className?: string;
};

/**
 * Thin wrapper that forwards product-card stock-urgency props to `VariantStockUrgency`.
 *
 * @param props.seedVariant - Variant providing the quantity-available count.
 * @param props.i18n - Locale dictionary for urgency label translations.
 * @param props.threshold - Maximum quantity that triggers the urgency message.
 * @param props.className - Additional CSS class names.
 * @returns The `VariantStockUrgency` element.
 */
const ProductCardStockUrgency = (props: ProductCardStockUrgencyProps) => <VariantStockUrgency {...props} />;

ProductCardStockUrgency.displayName = 'Nordcom.ProductCard.StockUrgency';
export default ProductCardStockUrgency;
