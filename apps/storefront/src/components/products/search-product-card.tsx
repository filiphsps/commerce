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

/**
 * Renders a product card preconfigured with the `search` surface preset.
 *
 * @param props.shop - Shop record forwarded to the product card.
 * @param props.locale - Locale forwarded to the product card.
 * @param props.data - Product to display.
 * @param props.priority - When `true`, loads the card image eagerly.
 * @param props.className - Additional CSS class names.
 * @returns The `ProductCard` element.
 */
const SearchProductCard = async (props: SearchProductCardProps) => (
    <ProductCard {...SURFACE_PRESETS.search} {...props} />
);

SearchProductCard.displayName = 'Nordcom.Products.SearchProductCard';
export default SearchProductCard;
