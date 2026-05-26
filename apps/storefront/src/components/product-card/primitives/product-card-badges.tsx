import 'server-only';

import type { Product } from '@/api/product';
import { VariantBadges } from '@/components/product-display';
import type { LocaleDictionary } from '@/utils/locale';

export type ProductCardBadgesProps = {
    data: Product;
    i18n: LocaleDictionary;
    className?: string;
};

const ProductCardBadges = ({ data, i18n, className }: ProductCardBadgesProps) => (
    <VariantBadges product={data} i18n={i18n} className={className} />
);

ProductCardBadges.displayName = 'Nordcom.ProductCard.Badges';
export default ProductCardBadges;
