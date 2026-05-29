import type { Product } from '@/api/product';
import { createProductSearchParams } from '@/api/product';
import Link from '@/components/link';

export type VariantTitleProps = {
    product: Product;
    showVendor?: boolean;
    omitProductType?: boolean;
    className?: string;
};

/**
 * Product-card title block: optional vendor eyebrow, the product title linked to its PDP, and an
 * optional product-type line. The title links to a variant-preselected PDP URL.
 *
 * @param props.product - Product whose title, vendor, type, and handle are rendered.
 * @param props.showVendor - When `true`, renders the vendor eyebrow above the title.
 * @param props.omitProductType - When `true`, suppresses the product-type line.
 * @param props.className - Additional class names for the wrapper element.
 * @returns The title block element.
 */
const VariantTitle = ({ product, showVendor = false, omitProductType = false, className }: VariantTitleProps) => {
    const params = createProductSearchParams({ product });
    const href = `/products/${product.handle}/${params ? `?${params}` : ''}`;
    const title = product.title;
    const vendor = product.vendor;
    const productType = product.productType ?? '';

    return (
        <div className={className} data-display="title">
            {showVendor && vendor ? (
                <div className="text-(length:--product-card-vendor-size) text-(color:var(--product-card-vendor-color)) select-text uppercase tracking-wide">
                    {vendor}
                </div>
            ) : null}
            <Link
                href={href}
                title={title}
                className="product-card-title focus-ring text-(color:var(--product-card-title-color)) block cursor-text select-text font-(--product-card-title-weight) text-sm leading-tight"
                style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            >
                {title}
            </Link>
            {!omitProductType && productType ? (
                <div className="text-(length:--product-card-vendor-size) text-(color:var(--product-card-vendor-color)) select-text">
                    {productType}
                </div>
            ) : null}
        </div>
    );
};

VariantTitle.displayName = 'Nordcom.ProductDisplay.VariantTitle';
export default VariantTitle;
