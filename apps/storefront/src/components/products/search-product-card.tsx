import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import type { Product } from '@/api/product';
import SurfaceProductCard from '@/components/products/surface-product-card';
import type { Locale } from '@/utils/locale';

export type SearchProductCardProps = {
    shop: OnlineShop;
    locale: Locale;
    data: Product;
    priority?: boolean;
    className?: string;
};

/**
 * Renders a product card for the `search` surface. Delegates to {@link SurfaceProductCard}, which
 * resolves the configuration through the store-default cascade (`extensions.productCard.search` over
 * the store base over the surface preset). A shop with no override renders byte-identically to the
 * preset.
 *
 * @param props.shop - Shop record; also the store-default source.
 * @param props.locale - Locale forwarded to the product card.
 * @param props.data - Product to display.
 * @param props.priority - When `true`, loads the card image eagerly.
 * @param props.className - Additional CSS class names.
 * @returns The `ProductCard` element.
 */
const SearchProductCard = (props: SearchProductCardProps) => <SurfaceProductCard surface="search" {...props} />;

SearchProductCard.displayName = 'Nordcom.Products.SearchProductCard';
export default SearchProductCard;
