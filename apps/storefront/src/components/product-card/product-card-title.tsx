import 'server-only';

import { cn } from '@/utils/tailwind';

import { Label } from '@/components/typography/label';

import type { Product } from '@/api/product';

export type ProductCardTitleProps = {
    data: Product;
    className?: string;
};
const ProductCardTitle = ({ data: product, className }: ProductCardTitleProps) => {
    let title = product.title.trim();
    if (
        product.productType &&
        product.productType.length > 0 &&
        title.toLowerCase().endsWith(product.productType.toLowerCase())
    ) {
        title = title.slice(0, -product.productType.length).trim();
    }

    let productTypeElement = null;
    if (product.productType) {
        productTypeElement = (
            <span
                data-nosnippet={true}
                className="contents text-lg font-semibold leading-none text-gray-700 group-hover/header:text-inherit"
            >
                {' '}
                &ndash; {product.productType}
            </span>
        );
    }

    return (
        <>
            <Label
                as={'div'}
                className={cn(
                    'group-hover/header:text-primary pb-1 pt-2 text-[0.9rem] font-medium normal-case leading-none text-gray-500 transition-colors duration-75',
                    className
                )}
            >
                {product.vendor}
            </Label>

            <div
                className={cn(
                    'group-hover/header:text-primary transition-color flex grow items-start justify-start gap-0 pr-1 text-[1.15rem] font-bold leading-tight text-current duration-75',
                    className
                )}
            >
                {title}
                {productTypeElement}
            </div>
        </>
    );
};

ProductCardTitle.displayName = 'Nordcom.ProductCard.Title';
export default ProductCardTitle;
