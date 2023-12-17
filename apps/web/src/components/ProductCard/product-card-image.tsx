'use client';

import type { Product } from '@/api/product';
import { AppendShopifyParameters } from '@/components/ProductCard/ProductCard';
import styles from '@/components/ProductCard/product-card.module.scss';
import Link from '@/components/link';
import { useShop } from '@/components/shop/provider';
import { deepEqual } from '@/utils/deep-equal';
import { useProduct } from '@shopify/hydrogen-react';
import type { Image as ShopifyImage } from '@shopify/hydrogen-react/storefront-api-types';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { memo, useMemo } from 'react';

interface VariantImageProps {
    image?: ShopifyImage;
    priority?: boolean;
}
const VariantImage = memo(({ image, priority }: VariantImageProps) => {
    if (!image) return null;

    return (
        <Image
            className={styles.image}
            src={image.url}
            alt={image.altText!}
            title={image.altText!}
            height={100}
            width={100}
            quality={75}
            sizes="(max-width: 950px) 25vw, 150px"
            decoding="async"
            loading={priority ? 'eager' : 'lazy'}
            priority={priority}
        />
    );
}, deepEqual);
VariantImage.displayName = 'Nordcom.ProductCard.Image.VariantImage';

export type ProductCardImageProps = {
    data?: Product;
    priority?: boolean;
    children?: ReactNode;
};

const ProductCardImage = memo(({ data: product, priority = false, children }: ProductCardImageProps) => {
    const { selectedVariant } = useProduct();
    const { shop } = useShop();
    if (!product || !selectedVariant) return null;

    const image = useMemo(
        () =>
            ((selectedVariant?.image &&
                product.images?.edges?.find((i) => i?.node?.id === selectedVariant?.image!.id)?.node) ||
                product.images?.edges?.[0]?.node) as ShopifyImage | undefined,
        [product, selectedVariant]
    );
    if (!image) return null;

    // TODO: Hotlink to variant.
    const href = AppendShopifyParameters({
        url: `/products/${product.handle}/`,
        params: (product as any).trackingParameters
    });

    const title = `${product.vendor} ${product.title} by ${shop.name}`;
    return (
        <Link href={href} className={styles['image-container']}>
            <VariantImage image={{ ...image, altText: image.altText || title }} priority={priority} />

            {children}
        </Link>
    );
}, deepEqual);

ProductCardImage.displayName = 'Nordcom.ProductCard.Image';
export default ProductCardImage;
