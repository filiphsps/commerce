import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import { productCardSurfaceForShop } from '@/api/extensions';
import type { Product } from '@/api/product';
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
 * Renders a product card for the `search` surface, resolving its configuration through the
 * store-default cascade (`extensions.productCard.search` over the surface preset). A shop with no
 * override renders byte-identically to the preset.
 *
 * @param props.shop - Shop record; also the store-default source.
 * @param props.locale - Locale forwarded to the product card.
 * @param props.data - Product to display.
 * @param props.priority - When `true`, loads the card image eagerly.
 * @param props.className - Additional CSS class names.
 * @returns The `ProductCard` element.
 */
const SearchProductCard = async (props: SearchProductCardProps) => (
    <ProductCard {...productCardSurfaceForShop(props.shop, 'search')} {...props} />
);

SearchProductCard.displayName = 'Nordcom.Products.SearchProductCard';
export default SearchProductCard;
