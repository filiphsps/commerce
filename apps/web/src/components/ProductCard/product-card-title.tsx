'use client';

import styles from '@/components/ProductCard/product-card.module.scss';
import Link from '@/components/link';
import { deepEqual } from '@/utils/deep-equal';
import { useProduct } from '@shopify/hydrogen-react';
import { memo } from 'react';
import { AppendShopifyParameters } from './ProductCard';

export type ProductCardTitleProps = {};
const ProductCardTitle = memo(({}: ProductCardTitleProps) => {
    const { product } = useProduct();
    if (!product) return null;

    // TODO: Hotlink to variant.
    const href = AppendShopifyParameters({
        url: `/products/${product.handle}/`,
        params: (product as any).trackingParameters
    });

    return (
        <Link href={href} className={styles.header}>
            {product?.vendor ? <div className={styles.brand}>{product.vendor}</div> : null}
            {product?.title ? <div className={styles.title}>{product.title}</div> : null}
        </Link>
    );
}, deepEqual);

ProductCardTitle.displayName = 'Nordcom.ProductCard.Title';
export default ProductCardTitle;
