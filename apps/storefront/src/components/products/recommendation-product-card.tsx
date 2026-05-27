import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import type { Product } from '@/api/product';
import { SURFACE_PRESETS } from '@/components/product-card/presets';
import ProductCard from '@/components/product-card/product-card';
import type { Locale } from '@/utils/locale';

export type RecommendationProductCardProps = {
    shop: OnlineShop;
    locale: Locale;
    data: Product;
    priority?: boolean;
    className?: string;
};

/**
 * Renders a product card preconfigured with the `recommendation` surface preset.
 *
 * @param props.shop - Shop record forwarded to the product card.
 * @param props.locale - Locale forwarded to the product card.
 * @param props.data - Product to display.
 * @param props.priority - When `true`, loads the card image eagerly.
 * @param props.className - Additional CSS class names.
 * @returns The `ProductCard` element.
 */
const RecommendationProductCard = async (props: RecommendationProductCardProps) => (
    <ProductCard {...SURFACE_PRESETS.recommendation} {...props} />
);

RecommendationProductCard.displayName = 'Nordcom.Products.RecommendationProductCard';
export default RecommendationProductCard;
