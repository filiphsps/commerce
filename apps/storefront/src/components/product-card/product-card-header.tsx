import { useMemo } from 'react';

import { createProductSearchParams, type Product } from '@/api/product';
import { Image } from '@shopify/hydrogen-react';

import Link from '@/components/link';

import type { ProductVariant } from '@/api/product';
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
        <div className="aspect-3/2 h-max w-full rounded-lg bg-white drop-shadow">
            <Image
                className="h-full w-full object-contain object-center p-3 transition-transform group-hover/card:scale-110"
                role={image.altText ? undefined : 'presentation'}
                src={image.url}
                alt={image.altText!}
                height={image.height ?? 100}
                width={image.width ?? 100}
                sizes="(max-width: 950px) 100px, 150px"
                decoding="async"
                draggable={false}
                loading={priority ? 'eager' : 'lazy'}
            />
        </div>
    );
};
VariantImage.displayName = 'Nordcom.ProductCard.Image.VariantImage';

export type ProductCardImageProps = {
    data?: Product;
    selectedVariant?: ProductVariant;
    priority?: boolean;
    children?: ReactNode;
};

const ProductCardHeader = ({
    data: product,
    selectedVariant = undefined,
    priority = false,
    children,
    ...props
}: ProductCardImageProps) => {
    const image = useMemo<ShopifyImage | undefined>(() => {
        if (!product || !selectedVariant) {
            return undefined;
        }

        // 1. Check if the variant has an image defined.
        if (selectedVariant.image) {
            if (selectedVariant.image.url) {
                return selectedVariant.image;
            }

            const image = product.images.edges.find((i) => i.node.id === selectedVariant.image!.id)?.node;
            if (image) {
                return image;
            }
        }

        // 2. If not, check if the product has a featured image.
        if (product.featuredImage?.url) {
            return product.featuredImage;
        }

        // 3. If not, try to get the first image from the product.
        // 3.1. Otherwise when the product has no images, return undefined.
        return product.images.edges.at(0)?.node;
    }, [product, selectedVariant]);

    if (!product || !selectedVariant || !image) {
        return null;
    }

    const title = `${product.vendor} ${product.title}`;

    const params = createProductSearchParams({ product });
    const href = `/products/${product.handle}/${params ? `?${params}` : ''}`;

    return (
        <Link className="group/header contents" href={href} title={title} prefetch={priority} tabIndex={0} {...props}>
            <VariantImage image={{ ...image, altText: image.altText ?? title }} priority={priority} />

            {children as any}
        </Link>
    );
};

ProductCardHeader.displayName = 'Nordcom.ProductCard.Header';
export default ProductCardHeader;
