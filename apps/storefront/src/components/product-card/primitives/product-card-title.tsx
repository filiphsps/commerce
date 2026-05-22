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
                className="contents font-medium text-[color:var(--product-card-vendor-color)] transition-colors group-hover/header:text-[color:var(--accent-primary)]"
            >
                {' '}
                &mdash; {product.productType}
            </span>
        );
    }

    const showVendor = product.vendor !== shop.name;

    return (
        <>
            {showVendor ? (
                <Label
                    as="div"
                    className={cn(
                        'inline-block normal-case leading-snug transition-colors duration-75 group-hover/header:text-[color:var(--accent-primary)]',
                        '[font-size:var(--product-card-vendor-size)]',
                        '[font-weight:var(--product-card-vendor-weight)]',
                        '[letter-spacing:var(--product-card-vendor-tracking)]',
                        '[color:var(--product-card-vendor-color)]',
                        className,
                    )}
                >
                    {product.vendor}
                </Label>
            ) : null}

            <div
                className={cn(
                    'flex items-start justify-start gap-0 pr-1 transition-colors duration-75 group-hover/header:text-[color:var(--accent-primary)]',
                    '[font-size:var(--product-card-title-size)]',
                    '[font-weight:var(--product-card-title-weight)]',
                    '[line-height:var(--product-card-title-line-height)]',
                    '[color:var(--product-card-title-color)]',
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
