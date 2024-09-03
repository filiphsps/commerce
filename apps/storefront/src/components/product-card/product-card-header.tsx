/* eslint-disable react-hooks/rules-of-hooks */
import 'server-only';

import { useMemo } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';

import { createProductSearchParams, type Product } from '@/api/product';
import { FirstAvailableVariant } from '@/utils/first-available-variant';
import Image from 'next/image';

import Link from '@/components/link';

import type { Image as ShopifyImage } from '@shopify/hydrogen-react/storefront-api-types';
import type { ReactNode } from 'react';

interface VariantImageProps {
    image?: ShopifyImage;
    priority?: boolean;
}
const VariantImage = ({ image, priority }: VariantImageProps) => {
    if (!image) {
        return null;
    }

    return (
        <Image
            className="aspect-3/2 h-max w-full rounded-lg bg-white object-contain object-center p-2 py-3"
            src={image.url}
            alt={image.altText!}
            title={image.altText!}
            height={image.height || 100}
            width={image.width || 100}
            sizes="(max-width: 950px) 80vw, 185px"
            decoding="async"
            draggable={false}
            loading={priority ? 'eager' : 'lazy'}
        />
    );
};
VariantImage.displayName = 'Nordcom.ProductCard.Image.VariantImage';

export type ProductCardImageProps = {
    shop: OnlineShop;
    data?: Product;
    priority?: boolean;
    children?: ReactNode;
};

const ProductCardHeader = ({ shop, data: product, priority = false, children, ...props }: ProductCardImageProps) => {
    const selectedVariant = FirstAvailableVariant(product);
    if (!product || !selectedVariant) {
        return null;
    }

    const image = useMemo<ShopifyImage | undefined>(
        () =>
            ((selectedVariant.image &&
                product.images.edges.find((i) => i.node.id === selectedVariant.image!.id)?.node) ||
                product.featuredImage ||
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                product.images.edges.find((image) => image.node)?.node) as ShopifyImage | undefined,
        [product, selectedVariant]
    );
    if (!image) return null;

    const title = `${product.vendor} ${product.title} by ${shop.name}`;
    const href = `/products/${product.handle}/${createProductSearchParams({ product })}`;

    return (
        <Link className="group/header contents" href={href} title={title} prefetch={priority} {...props}>
            <VariantImage image={{ ...image, altText: image.altText || title }} priority={priority} />

            {children}
        </Link>
    );
};

ProductCardHeader.displayName = 'Nordcom.ProductCard.Header';
export default ProductCardHeader;
