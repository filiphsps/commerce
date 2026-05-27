import 'server-only';

import type { Product } from '@/api/product';
import { VariantBadges } from '@/components/product-display';
import type { LocaleDictionary } from '@/utils/locale';

export type ProductCardBadgesProps = {
    data: Product;
    i18n: LocaleDictionary;
    className?: string;
};

/**
 * Thin server wrapper that renders `VariantBadges` with product-card prop naming.
 *
 * @param props.data - Product used to determine which badges to show.
 * @param props.i18n - Locale dictionary for badge label translations.
 * @param props.className - Additional CSS class names forwarded to `VariantBadges`.
 * @returns The badge overlay element.
 */
const ProductCardBadges = ({ data, i18n, className }: ProductCardBadgesProps) => (
    <VariantBadges product={data} i18n={i18n} className={className} />
);

ProductCardBadges.displayName = 'Nordcom.ProductCard.Badges';
export default ProductCardBadges;
