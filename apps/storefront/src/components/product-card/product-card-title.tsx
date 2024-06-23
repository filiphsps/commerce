import 'server-only';

import styles from '@/components/product-card/product-card.module.scss';

import { memo } from 'react';

import { createProductSearchParams } from '@/api/product';
import { deepEqual } from '@/utils/deep-equal';

import Link from '@/components/link';

import type { Product } from '@/api/product';

export type ProductCardTitleProps = {
    data: Product;
};
const ProductCardTitle = memo(({ data: product }: ProductCardTitleProps) => {
    if (!product) return null;

    const href = `/products/${product.handle}/${createProductSearchParams({ product })}`;

    return (
        <Link href={href} className={styles.header}>
            {product.vendor ? <span className={styles.brand}>{product.vendor}</span> : null}
            {product.title ? product.title : null}
        </Link>
    );
}, deepEqual);

ProductCardTitle.displayName = 'Nordcom.ProductCard.Title';
export default ProductCardTitle;
