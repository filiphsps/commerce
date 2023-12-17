'use client';

import styles from '@/components/ProductCard/product-card.module.scss';
import { deepEqual } from '@/utils/deep-equal';
import { useProduct } from '@shopify/hydrogen-react';
import { memo } from 'react';

export type ProductTitleProps = {};
const ProductTitle = memo(({}: ProductTitleProps) => {
    const { product } = useProduct();

    return (
        <>
            {product?.vendor ? <div className={styles.brand}>{product.vendor}</div> : null}
            {product?.title ? <div className={styles.title}>{product.title}</div> : null}
        </>
    );
}, deepEqual);

ProductTitle.displayName = 'Nordcom.ProductTitle';
export default ProductTitle;
