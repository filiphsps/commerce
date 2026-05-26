import type { Product } from '@/api/product';
import { createProductSearchParams } from '@/api/product';
import Link from '@/components/link';

export type VariantTitleProps = {
    product: Product;
    showVendor?: boolean;
    omitProductType?: boolean;
    className?: string;
};

const VariantTitle = ({ product, showVendor = false, omitProductType = false, className }: VariantTitleProps) => {
    const params = createProductSearchParams({ product });
    const href = `/products/${product.handle}/${params ? `?${params}` : ''}`;
    const title = product.title;
    const vendor = product.vendor;
    const productType = product.productType ?? '';

    return (
        <div className={className} data-display="title">
            {showVendor && vendor ? (
                <div className="text-(length:--product-card-vendor-size) text-(color:var(--product-card-vendor-color)) uppercase tracking-wide">
                    {vendor}
                </div>
            ) : null}
            <Link
                href={href}
                title={title}
                className="product-card-title text-(length:--product-card-title-size) text-(color:var(--product-card-title-color)) block font-(--product-card-title-weight) leading-tight"
                style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            >
                {title}
            </Link>
            {!omitProductType && productType ? (
                <div className="text-(length:--product-card-vendor-size) text-(color:var(--product-card-vendor-color))">
                    {productType}
                </div>
            ) : null}
        </div>
    );
};

VariantTitle.displayName = 'Nordcom.ProductDisplay.VariantTitle';
export default VariantTitle;
