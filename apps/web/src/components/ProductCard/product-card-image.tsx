'use client';

import { AppendShopifyParameters } from '@/components/ProductCard/ProductCard';
import styles from '@/components/ProductCard/product-card.module.scss';
import Link from '@/components/link';
import { useShop } from '@/components/shop/provider';
import { deepEqual } from '@/utils/deep-equal';
import { useProduct } from '@shopify/hydrogen-react';
import type { Image as ShopifyImage } from '@shopify/hydrogen-react/storefront-api-types';
import Image from 'next/image';
import { memo } from 'react';

export type ProductCardImageProps = {
    priority?: boolean;
};

const ProductCardImage = memo(({ priority = false }: ProductCardImageProps) => {
    const { product, selectedVariant } = useProduct();
    const { shop } = useShop();
    if (!product || !selectedVariant) return null;

    // TODO: useMemo for this.
    const image: ShopifyImage | undefined = ((selectedVariant?.image &&
        product.images?.edges?.find((i) => i?.node?.id === selectedVariant?.image!.id)?.node) ||
        product.images?.edges?.[0]?.node) as ShopifyImage | undefined;
    if (!image) return null;

    // TODO: Hotlink to variant.
    const href = AppendShopifyParameters({
        url: `/products/${product.handle}/`,
        params: (product as any).trackingParameters
    });

    const title = `${product.vendor} ${product.title} by ${shop.name}`;
    return (
        <Link href={href} className={styles['image-wrapper']}>
            <Image
                className={styles.image}
                src={image.url!}
                alt={image.altText || title}
                title={image.altText || title}
                width={195}
                height={155}
                quality={85}
                sizes="(max-width: 950px) 155px, 200px"
                loading={priority ? 'eager' : 'lazy'}
                priority={priority}
            />
        </Link>
    );
}, deepEqual);

ProductCardImage.displayName = 'Nordcom.ProductCard.Image';
export default ProductCardImage;
