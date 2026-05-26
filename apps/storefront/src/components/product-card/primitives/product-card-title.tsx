import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import type { Product } from '@/api/product';
import { VariantTitle } from '@/components/product-display';

export type ProductCardTitleProps = {
    shop: OnlineShop;
    data: Product;
    className?: string;
};

const ProductCardTitle = ({ shop, data, className }: ProductCardTitleProps) => {
    const showVendor = (shop as { showProductVendor?: boolean }).showProductVendor === true;
    return <VariantTitle product={data} showVendor={showVendor} className={className ?? 'product-card-title'} />;
};

ProductCardTitle.displayName = 'Nordcom.ProductCard.Title';
export default ProductCardTitle;
