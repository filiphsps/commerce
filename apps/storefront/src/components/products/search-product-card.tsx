import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import type { Product } from '@/api/product';
import { SURFACE_PRESETS } from '@/components/product-card/presets';
import ProductCard from '@/components/product-card/product-card';
import type { Locale } from '@/utils/locale';

export type SearchProductCardProps = {
    shop: OnlineShop;
    locale: Locale;
    data: Product;
    priority?: boolean;
    className?: string;
};

const SearchProductCard = async (props: SearchProductCardProps) => (
    <ProductCard {...SURFACE_PRESETS.search} {...props} />
);

SearchProductCard.displayName = 'Nordcom.Products.SearchProductCard';
export default SearchProductCard;
