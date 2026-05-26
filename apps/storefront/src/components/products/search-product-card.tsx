import type { OnlineShop } from '@nordcom/commerce-db';
import type { Product } from '@/api/product';
import ProductCard from '@/components/product-card';
import type { Locale } from '@/utils/locale';

export type SearchProductCardProps = {
    shop: OnlineShop;
    locale: Locale;
    data: Product;
    priority?: boolean;
    className?: string;
};

const SearchProductCard = ({ shop, locale, data, priority, className }: SearchProductCardProps) => (
    <ProductCard
        shop={shop}
        locale={locale}
        data={data}
        variant="horizontal-bare"
        priority={priority}
        className={className}
    />
);

SearchProductCard.displayName = 'Nordcom.Products.SearchProductCard';
export default SearchProductCard;
