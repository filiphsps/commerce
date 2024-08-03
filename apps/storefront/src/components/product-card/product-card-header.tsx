/* eslint-disable react-hooks/rules-of-hooks */

import styles from '@/components/product-card/product-card.module.scss';

import { memo, useMemo } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';

import { createProductSearchParams } from '@/api/product';
import { deepEqual } from '@/utils/deep-equal';
import { FirstAvailableVariant } from '@/utils/first-available-variant';
import { cn } from '@/utils/tailwind';
import Image from 'next/image';

import Link from '@/components/link';

import type { Product } from '@/api/product';
import type { Image as ShopifyImage } from '@shopify/hydrogen-react/storefront-api-types';
import type { ReactNode } from 'react';

interface VariantImageProps {
    image?: ShopifyImage;
    priority?: boolean;
}
const VariantImage = memo(({ image, priority }: VariantImageProps) => {
    if (!image) return null;

    return (
        <Image
            className={cn(styles.image, 'rounded-lg')}
            src={image.url}
            alt={image.altText!}
            title={image.altText!}
            height={100}
            width={100}
            quality={75}
            sizes="(max-width: 950px) 25vw, 85px"
            decoding="async"
            draggable={false}
            loading={priority ? 'eager' : 'lazy'}
            priority={priority}
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

const ProductCardHeader = ({ shop, data: product, priority = false, children }: ProductCardImageProps) => {
    const selectedVariant = FirstAvailableVariant(product);
    if (!product || !selectedVariant) return null;

    const image = useMemo(
        () =>
            ((selectedVariant.image &&
                product.images.edges.find((i) => i.node.id === selectedVariant.image!.id)?.node) ||
                product.images.edges[0]?.node) as ShopifyImage | undefined,
        [product, selectedVariant]
    );
    if (!image) return null;

    const title = `${product.vendor} ${product.title} by ${shop.name}`;
    const href = `/products/${product.handle}/${createProductSearchParams({ product })}`;

    return (
        <Link href={href || ''} className={styles.header}>
            <VariantImage image={{ ...image, altText: image.altText || title }} priority={priority} />

            {children}
        </Link>
    );
};

ProductCardHeader.displayName = 'Nordcom.ProductCard.Header';
export default ProductCardHeader;
