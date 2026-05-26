import type { ProductVariant } from '@/api/product';
import { VariantStockUrgency } from '@/components/product-display';
import type { LocaleDictionary } from '@/utils/locale';

export type ProductCardStockUrgencyProps = {
    seedVariant: ProductVariant;
    i18n: LocaleDictionary;
    threshold?: number;
    className?: string;
};

const ProductCardStockUrgency = (props: ProductCardStockUrgencyProps) => <VariantStockUrgency {...props} />;

ProductCardStockUrgency.displayName = 'Nordcom.ProductCard.StockUrgency';
export default ProductCardStockUrgency;
