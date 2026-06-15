import type { Product } from '@/api/product';
import { createProductSearchParams } from '@/api/product';
import Link from '@/components/link';

export type VariantTitleProps = {
    product: Product;
    showVendor?: boolean;
    vendorHref?: string | null;
    omitProductType?: boolean;
    className?: string;
};

const VENDOR_EYEBROW_CLASS =
    'text-(length:--product-card-vendor-size) text-(color:var(--product-card-vendor-color)) select-text uppercase tracking-wide';

/**
 * Product-card title block: optional vendor eyebrow, the product title linked to its PDP, and an
 * optional product-type line. The title links to a variant-preselected PDP URL. The vendor eyebrow is
 * the single vendor element on the card; when `vendorHref` is supplied it renders as a link to the
 * vendor's collection (or the vendor-filtered all-products page).
 *
 * @param props.product - Product whose title, vendor, type, and handle are rendered.
 * @param props.showVendor - When `true`, renders the vendor eyebrow above the title.
 * @param props.vendorHref - Destination for the vendor eyebrow; when present it renders as a link.
 * @param props.omitProductType - When `true`, suppresses the product-type line.
 * @param props.className - Additional class names for the wrapper element.
 * @returns The title block element.
 */
const VariantTitle = ({
    product,
    showVendor = false,
    vendorHref = null,
    omitProductType = false,
    className,
}: VariantTitleProps) => {
    const params = createProductSearchParams({ product });
    const href = `/products/${product.handle}/${params ? `?${params}` : ''}`;
    const title = product.title;
    const vendor = product.vendor;
    const productType = product.productType ?? '';

    return (
        <div className={className} data-display="title">
            {showVendor && vendor ? (
                vendorHref ? (
                    <Link
                        href={vendorHref}
                        prefetch={false}
                        className={`${VENDOR_EYEBROW_CLASS} focus-ring block w-fit transition-colors hover:text-primary focus-visible:text-primary`}
                    >
                        {vendor}
                    </Link>
                ) : (
                    <div className={VENDOR_EYEBROW_CLASS}>{vendor}</div>
                )
            ) : null}
            <Link
                href={href}
                title={title}
                className="product-card-title focus-ring text-(color:var(--product-card-title-color)) text-(length:--product-card-title-size) block cursor-text select-text font-(--product-card-title-weight) leading-tight"
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
