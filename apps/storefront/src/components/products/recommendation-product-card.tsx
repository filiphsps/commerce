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

const RecommendationProductCard = async (props: RecommendationProductCardProps) => (
    <ProductCard {...SURFACE_PRESETS.recommendation} {...props} />
);

RecommendationProductCard.displayName = 'Nordcom.Products.RecommendationProductCard';
export default RecommendationProductCard;
