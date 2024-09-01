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
                    'group-hover/header:text-primary pt-2 text-base font-medium normal-case leading-tight text-gray-500 transition-colors',
                    classHame
                )}
            >
                {product.vendor}
            </Label>
            <div
                className={cn(
                    'group-hover/header:text-primary transition-color block text-xl font-bold leading-tight text-current',
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
