import 'server-only';

import type { Product } from '@/api/product';
import styles from '@/components/ProductCard/product-card.module.scss';
import Link from '@/components/link';
import { deepEqual } from '@/utils/deep-equal';
import { memo } from 'react';

export type ProductCardTitleProps = {
    data: Product;
};
const ProductCardTitle = memo(({ data: product }: ProductCardTitleProps) => {
    if (!product) return null;

    // TODO: Hotlink to variant.
    // TODO: `product.trackingParameters`.

    return (
        <Link href={`/products/${product.handle}/`} className={styles.header}>
            {product?.vendor ? <div className={styles.brand}>{product.vendor}</div> : null}
            {product?.title ? <div className={styles.title}>{product.title}</div> : null}
        </Link>
    );
}, deepEqual);

ProductCardTitle.displayName = 'Nordcom.ProductCard.Title';
export default ProductCardTitle;
