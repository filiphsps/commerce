import type { OnlineShop } from '@nordcom/commerce-db';
import type { Product } from '@/api/product';
import ProductCard from '@/components/product-card';
import type { Locale } from '@/utils/locale';

export type CollectionProductCardProps = {
    shop: OnlineShop;
    locale: Locale;
    data: Product;
    priority?: boolean;
    className?: string;
};

const CollectionProductCard = ({ shop, locale, data, priority, className }: CollectionProductCardProps) => (
    <ProductCard
        shop={shop}
        locale={locale}
        data={data}
        variant="vertical-boxed"
        priority={priority}
        className={className}
    />
);

CollectionProductCard.displayName = 'Nordcom.Products.CollectionProductCard';
export default CollectionProductCard;
