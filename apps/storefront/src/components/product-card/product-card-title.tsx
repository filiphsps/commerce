import 'server-only';

import { Label } from '@/components/typography/label';

import type { Product } from '@/api/product';

export type ProductCardTitleProps = {
    data: Product;
};
const ProductCardTitle = ({ data: product }: ProductCardTitleProps) => {
    return (
        <>
            <Label className="overflow-hidden text-ellipsis whitespace-nowrap pt-2 text-sm leading-none opacity-75">
                {product.vendor}
            </Label>
            <div className="overflow-hidden text-ellipsis whitespace-nowrap text-lg font-semibold leading-tight">
                {product.title}
            </div>
        </>
    );
};

ProductCardTitle.displayName = 'Nordcom.ProductCard.Title';
export default ProductCardTitle;
