import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import type { Product } from '@/api/product';
import { VariantTitle } from '@/components/product-display';

export type ProductCardTitleProps = {
    shop: OnlineShop;
    data: Product;
    className?: string;
};

/**
 * Server component rendering the product title and, when the shop setting permits, the vendor name.
 *
 * @param props.shop - Shop configuration that controls whether the vendor line is shown.
 * @param props.data - Product providing the title and vendor.
 * @param props.className - CSS class names forwarded to `VariantTitle`.
 * @returns The `VariantTitle` element.
 */
const ProductCardTitle = ({ shop, data, className }: ProductCardTitleProps) => {
    const showVendor = shop.showProductVendor === true;
    return <VariantTitle product={data} showVendor={showVendor} className={className ?? 'product-card-title'} />;
};

ProductCardTitle.displayName = 'Nordcom.ProductCard.Title';
export default ProductCardTitle;
