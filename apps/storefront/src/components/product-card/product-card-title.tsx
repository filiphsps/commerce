import 'server-only';

import { cn } from '@/utils/tailwind';

import { Label } from '@/components/typography/label';

import type { Product } from '@/api/product';

export type ProductCardTitleProps = {
    data: Product;
    oneLine?: boolean;
};
const ProductCardTitle = ({ data: product, oneLine = false }: ProductCardTitleProps) => {
    return (
        <>
            <Label
                className={cn(
                    'group-hover/header:text-primary pt-2 text-sm leading-tight text-gray-700 transition-colors',
                    oneLine && 'overflow-hidden text-ellipsis whitespace-nowrap'
                )}
            >
                {product.vendor}
            </Label>
            <div
                className={cn(
                    'group-hover/header:text-primary text-lg font-semibold leading-tight text-black transition-colors',
                    oneLine && 'overflow-hidden text-ellipsis whitespace-nowrap'
                )}
            >
                {product.title}
            </div>
        </>
    );
};

ProductCardTitle.displayName = 'Nordcom.ProductCard.Title';
export default ProductCardTitle;
