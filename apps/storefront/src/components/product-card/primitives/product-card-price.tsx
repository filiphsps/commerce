import type { ProductVariant } from '@/api/product';
import { VariantPrice } from '@/components/product-display';
import type { Locale } from '@/utils/locale';

export type ProductCardPriceProps = {
    seedVariant: ProductVariant;
    locale: Locale;
    className?: string;
};

const ProductCardPrice = ({ seedVariant, locale, className }: ProductCardPriceProps) => (
    <VariantPrice seedVariant={seedVariant} locale={locale.code} className={className ?? 'product-card-price-row'} />
);

ProductCardPrice.displayName = 'Nordcom.ProductCard.Price';
export default ProductCardPrice;
