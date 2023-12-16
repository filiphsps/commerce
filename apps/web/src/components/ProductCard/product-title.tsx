import styles from '@/components/ProductCard/product-card.module.scss';
import { deepEqual } from '@/utils/deep-equal';
import { memo } from 'react';

export type ProductTitleProps = {
    title?: string;
    vendor?: string;
};

const ProductTitle = memo(({ title, vendor }: ProductTitleProps) => {
    return (
        <>
            {vendor ? <div className={styles.brand}>{vendor}</div> : null}
            {title ? <div className={styles.title}>{title}</div> : null}
        </>
    );
}, deepEqual);
ProductTitle.displayName = 'Nordcom.ProductTitle';

export default ProductTitle;
