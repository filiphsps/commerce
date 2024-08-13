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
                    'hover:text-primary pt-2 text-sm leading-tight text-gray-700 transition-colors',
                    oneLine && 'overflow-hidden text-ellipsis whitespace-nowrap'
                )}
            >
                {product.vendor}
            </Label>
            <div
                className={cn(
                    'hover:text-primary pb-1 text-lg font-semibold leading-[1.1] text-black transition-colors',
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
