import type { Product } from '@/api/product';
import type { Shop } from '@/api/shop';
import Link from '@/components/link';
import styles from '@/components/product-card/product-card.module.scss';
import { deepEqual } from '@/utils/deep-equal';
import { FirstAvailableVariant } from '@/utils/first-available-variant';
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
            height={image.height || 100}
            width={image.width || 100}
            quality={75}
            sizes="(max-width: 950px) 25vw, 100px"
            decoding="async"
            draggable={false}
            loading={priority ? 'eager' : 'lazy'}
            priority={priority}
        />
    );
}, deepEqual);
VariantImage.displayName = 'Nordcom.ProductCard.Image.VariantImage';

export type ProductCardImageProps = {
    shop: Shop;
    data?: Product;
    priority?: boolean;
    children?: ReactNode;
};

const ProductCardImage = ({ shop, data: product, priority = false, children }: ProductCardImageProps) => {
    const selectedVariant = FirstAvailableVariant(product);
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
    // TODO: `product.trackingParameters`.

    const title = `${product.vendor} ${product.title} by ${shop.name}`;
    return (
        <Link href={`/products/${product.handle}/`} className={styles['image-container']}>
            <VariantImage image={{ ...image, altText: image.altText || title }} priority={priority} />

            {children}
        </Link>
    );
};

ProductCardImage.displayName = 'Nordcom.ProductCard.Image';
export default ProductCardImage;
