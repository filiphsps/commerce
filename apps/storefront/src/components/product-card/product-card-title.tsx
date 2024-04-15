import 'server-only';

import styles from '@/components/product-card/product-card.module.scss';

import { memo } from 'react';

import { deepEqual } from '@/utils/deep-equal';

import Link from '@/components/link';

import type { Product } from '@/api/product';

export type ProductCardTitleProps = {
    data: Product;
};
const ProductCardTitle = memo(({ data: product }: ProductCardTitleProps) => {
    if (!product) return null;

    // TODO: Hotlink to variant.
    // TODO: `product.trackingParameters`.

    return (
        <Link href={`/products/${product.handle}/`} className={styles.header}>
            <h3 className={styles.title}>
                {product.vendor ? <span className={styles.brand}>{product.vendor}</span> : null}
                {product.title ? product.title : null}
            </h3>
        </Link>
    );
}, deepEqual);

ProductCardTitle.displayName = 'Nordcom.ProductCard.Title';
export default ProductCardTitle;
