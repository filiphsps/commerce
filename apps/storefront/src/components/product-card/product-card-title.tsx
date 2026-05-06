import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import type { Product } from '@/api/product';

import { Label } from '@/components/typography/label';
import { cn } from '@/utils/tailwind';

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
                className="contents font-semibold text-gray-700 text-lg leading-none transition-colors group-hover/header:text-primary"
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
                        'pt-2 font-medium text-gray-700 text-sm normal-case leading-snug transition-colors duration-75 group-hover/header:text-primary',
                        className,
                    )}
                >
                    {product.vendor}
                </Label>
            ) : (
                <div className="h-2 w-full" />
            )}

            <div
                className={cn(
                    'flex grow items-start justify-start gap-0 pr-1 font-bold text-current text-lg leading-tight transition-color duration-75 group-hover/header:text-primary',
                    className,
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
