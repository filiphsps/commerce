import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';

import { cn } from '@/utils/tailwind';

import { Label } from '@/components/typography/label';

import type { Product } from '@/api/product';

export type ProductCardTitleProps = {
    shop: OnlineShop;
    data: Product;
    className?: string;
};
const ProductCardTitle = ({ shop, data: product, className }: ProductCardTitleProps) => {
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
                className="group-hover/header:text-primary contents text-lg font-semibold leading-none text-gray-700 transition-colors"
            >
                {' '}
                &ndash; {product.productType}
            </span>
        );
    }

    const showVendor = product.vendor !== shop.name;

    return (
        <>
            {showVendor ? (
                <Label
                    as={'div'}
                    className={cn(
                        'group-hover/header:text-primary pt-2 text-sm font-medium normal-case leading-snug text-gray-700 transition-colors duration-75',
                        className
                    )}
                >
                    {product.vendor}
                </Label>
            ) : (
                <div className="h-2 w-full" />
            )}

            <div
                className={cn(
                    'group-hover/header:text-primary transition-color flex grow items-start justify-start gap-0 pr-1 text-lg font-bold leading-tight text-current duration-75',
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
