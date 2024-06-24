import 'server-only';

import type { Product } from '@/api/product';

export type ProductCardTitleProps = {
    data: Product;
};
const ProductCardTitle = ({ data: product }: ProductCardTitleProps) => {
    return (
        <>
            <div className="overflow-hidden text-ellipsis whitespace-nowrap px-1 pt-2 text-sm font-semibold leading-none">
                {product.vendor}
            </div>
            <div className="overflow-hidden text-ellipsis whitespace-nowrap px-1 text-lg font-medium leading-tight">
                {product.title}
            </div>
        </>
    );
};

ProductCardTitle.displayName = 'Nordcom.ProductCard.Title';
export default ProductCardTitle;
