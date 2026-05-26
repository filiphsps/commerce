import type { OnlineShop } from '@nordcom/commerce-db';
import type { Product } from '@/api/product';
import ProductCard from '@/components/product-card';
import type { Locale } from '@/utils/locale';

export type RecommendationProductCardProps = {
    shop: OnlineShop;
    locale: Locale;
    data: Product;
    priority?: boolean;
    className?: string;
};

const RecommendationProductCard = ({ shop, locale, data, priority, className }: RecommendationProductCardProps) => (
    <ProductCard
        shop={shop}
        locale={locale}
        data={data}
        variant="vertical-boxed"
        priority={priority}
        className={className}
    />
);

RecommendationProductCard.displayName = 'Nordcom.Products.RecommendationProductCard';
export default RecommendationProductCard;
