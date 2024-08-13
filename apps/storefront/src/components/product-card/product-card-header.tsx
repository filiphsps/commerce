/* eslint-disable react-hooks/rules-of-hooks */

import { memo, useMemo } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';

import { createProductSearchParams, type Product } from '@/api/product';
import { deepEqual } from '@/utils/deep-equal';
import { FirstAvailableVariant } from '@/utils/first-available-variant';
import { Image as ShopifyImage } from '@shopify/hydrogen-react';

import Link from '@/components/link';

import type { Image } from '@shopify/hydrogen-react/storefront-api-types';
import type { ReactNode } from 'react';

interface VariantImageProps {
    image?: Image;
    priority?: boolean;
}
const VariantImage = memo(({ image, priority }: VariantImageProps) => {
    if (!image) return null;

    return (
        <ShopifyImage
            className="h-32 max-h-32 min-h-32 w-full rounded-lg bg-white object-contain object-center p-2"
            src={image.url}
            alt={image.altText!}
            title={image.altText!}
            height={image.height || 100}
            width={image.width || 100}
            sizes="(max-width: 950px) 100px, 185px"
            decoding="async"
            draggable={false}
            loading={priority ? 'eager' : 'lazy'}
        />
    );
}, deepEqual);
VariantImage.displayName = 'Nordcom.ProductCard.Image.VariantImage';

export type ProductCardImageProps = {
    shop: OnlineShop;
    data?: Product;
    priority?: boolean;
    children?: ReactNode;
};

const ProductCardHeader = ({ shop, data: product, priority = false, children, ...props }: ProductCardImageProps) => {
    const selectedVariant = FirstAvailableVariant(product);
    if (!product || !selectedVariant) return null;

    const image = useMemo(
        () =>
            ((selectedVariant.image &&
                product.images.edges.find((i) => i.node.id === selectedVariant.image!.id)?.node) ||
                product.images.edges[0]?.node) as Image | undefined,
        [product, selectedVariant]
    );
    if (!image) return null;

    const title = `${product.vendor} ${product.title} by ${shop.name}`;
    const href = `/products/${product.handle}/${createProductSearchParams({ product })}`;

    return (
        <Link className="contents" href={href} title={title} {...props}>
            <VariantImage image={{ ...image, altText: image.altText || title }} priority={priority} />

            {children}
        </Link>
    );
};

ProductCardHeader.displayName = 'Nordcom.ProductCard.Header';
export default ProductCardHeader;
