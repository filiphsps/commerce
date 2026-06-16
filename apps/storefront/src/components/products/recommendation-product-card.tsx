import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import type { Product } from '@/api/product';
import SurfaceProductCard from '@/components/products/surface-product-card';
import type { Locale } from '@/utils/locale';

export type RecommendationProductCardProps = {
    shop: OnlineShop;
    locale: Locale;
    data: Product;
    priority?: boolean;
    className?: string;
};

/**
 * Renders a product card for the `recommendation` surface. Delegates to {@link SurfaceProductCard},
 * resolving the configuration through the store-default cascade (`extensions.productCard.recommendation`
 * over the store `base` over the surface preset) — so recommendation cards are tenant-customizable
 * exactly like the collection and search surfaces. A shop with no extensions renders byte-identically
 * to the preset.
 *
 * @param props.shop - Shop record; also the store-default source.
 * @param props.locale - Locale forwarded to the product card.
 * @param props.data - Product to display.
 * @param props.priority - When `true`, loads the card image eagerly.
 * @param props.className - Additional CSS class names.
 * @returns The `ProductCard` element.
 */
const RecommendationProductCard = (props: RecommendationProductCardProps) => (
    <SurfaceProductCard surface="recommendation" {...props} />
);

RecommendationProductCard.displayName = 'Nordcom.Products.RecommendationProductCard';
export default RecommendationProductCard;
