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
                    'pt-2 text-sm leading-tight opacity-75',
                    oneLine && 'overflow-hidden text-ellipsis whitespace-nowrap'
                )}
            >
                {product.vendor}
            </Label>
            <div
                className={cn(
                    'pb-1 text-lg font-semibold leading-[1.15]',
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
