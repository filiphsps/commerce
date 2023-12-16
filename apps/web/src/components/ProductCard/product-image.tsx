import styles from '@/components/ProductCard/product-card.module.scss';
import { deepEqual } from '@/utils/deep-equal';
import type { Image as ShopifyImage } from '@shopify/hydrogen-react/storefront-api-types';
import Image from 'next/image';
import { memo } from 'react';

export type ProductCardImageProps = {
    image?: ShopifyImage;
    priority?: boolean;
};

const ProductCardImage = memo(({ image, priority }: ProductCardImageProps) => {
    if (!image) return null;

    return (
        <Image
            className={styles.image}
            key={image.id}
            id={image.id!}
            src={image.url}
            alt={image?.altText!}
            title={image?.altText!}
            width={195}
            height={155}
            quality={85}
            sizes="(max-width: 950px) 155px, 200px"
            loading={priority ? 'eager' : 'lazy'}
            priority={priority}
        />
    );
}, deepEqual);
ProductCardImage.displayName = 'Nordcom.ProductCardImage';

export default ProductCardImage;
