import 'server-only';

import styles from '@/components/product-card/product-card.module.scss';

import type { Product } from '@/api/product';

export type ProductCardTitleProps = {
    data: Product;
};
const ProductCardTitle = ({ data: product }: ProductCardTitleProps) => {
    return (
        <>
            <div className={styles.brand}>{product.vendor}</div>
            <div className={styles.title}>{product.title}</div>
        </>
    );
};

ProductCardTitle.displayName = 'Nordcom.ProductCard.Title';
export default ProductCardTitle;
