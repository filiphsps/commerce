import 'server-only';

import { cn } from '@/utils/tailwind';

import { Label } from '@/components/typography/label';

import type { Product } from '@/api/product';

export type ProductCardTitleProps = {
    data: Product;
    classHame?: string;
};
const ProductCardTitle = ({ data: product, classHame }: ProductCardTitleProps) => {
    return (
        <>
            <Label
                as={'div'}
                className={cn(
                    'group-hover/header:text-primary pb-1 pt-2 text-sm font-medium normal-case leading-none text-gray-500 transition-colors',
                    classHame
                )}
            >
                {product.vendor}
            </Label>
            <div
                className={cn(
                    'group-hover/header:text-primary transition-color text- block text-[1.20rem] font-bold leading-6 text-current',
                    classHame
                )}
            >
                {product.title}
            </div>
        </>
    );
};

ProductCardTitle.displayName = 'Nordcom.ProductCard.Title';
export default ProductCardTitle;
