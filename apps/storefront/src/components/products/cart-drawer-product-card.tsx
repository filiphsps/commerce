import type { OnlineShop } from '@nordcom/commerce-db';
import type { Product } from '@/api/product';
import ProductCard from '@/components/product-card';
import type { Locale } from '@/utils/locale';

export type CartDrawerProductCardProps = {
    shop: OnlineShop;
    locale: Locale;
    data: Product;
    priority?: boolean;
    className?: string;
};

const CartDrawerProductCard = ({ shop, locale, data, priority, className }: CartDrawerProductCardProps) => (
    <ProductCard
        shop={shop}
        locale={locale}
        data={data}
        variant="horizontal-boxed"
        priority={priority}
        className={className}
    />
);

CartDrawerProductCard.displayName = 'Nordcom.Products.CartDrawerProductCard';
export default CartDrawerProductCard;
