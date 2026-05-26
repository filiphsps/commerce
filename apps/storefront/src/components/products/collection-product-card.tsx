import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import type { Product } from '@/api/product';
import { SURFACE_PRESETS } from '@/components/product-card/presets';
import ProductCard from '@/components/product-card/product-card';
import type { Locale } from '@/utils/locale';

export type CollectionProductCardProps = {
    shop: OnlineShop;
    locale: Locale;
    data: Product;
    priority?: boolean;
    className?: string;
};

const CollectionProductCard = async (props: CollectionProductCardProps) => (
    <ProductCard {...SURFACE_PRESETS.collection} {...props} />
);

CollectionProductCard.displayName = 'Nordcom.Products.CollectionProductCard';
export default CollectionProductCard;
