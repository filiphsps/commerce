import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import type { Product } from '@/api/product';
import type { ProductCardSurfaceOverride } from '@/components/product-card/presets';
import SurfaceProductCard from '@/components/products/surface-product-card';
import type { Locale } from '@/utils/locale';

export type CollectionProductCardProps = {
    shop: OnlineShop;
    locale: Locale;
    data: Product;
    priority?: boolean;
    className?: string;
    /** Per-instance override from the hosting collection block node; highest cascade tier. */
    cardOverride?: ProductCardSurfaceOverride;
};

/**
 * Renders a product card for the `collection` surface. Delegates to {@link SurfaceProductCard}, which
 * resolves the configuration through the store-default cascade (per-instance `cardOverride` →
 * `extensions.productCard.collection` → store base → surface preset). A shop with no override renders
 * byte-identically to the preset.
 *
 * @param props.shop - Shop record; also the store-default source.
 * @param props.locale - Locale forwarded to the product card.
 * @param props.data - Product to display.
 * @param props.priority - When `true`, loads the card image eagerly.
 * @param props.className - Additional CSS class names.
 * @param props.cardOverride - Per-instance override from the hosting collection block.
 * @returns The `ProductCard` element.
 */
const CollectionProductCard = (props: CollectionProductCardProps) => (
    <SurfaceProductCard surface="collection" {...props} />
);

CollectionProductCard.displayName = 'Nordcom.Products.CollectionProductCard';
export default CollectionProductCard;
