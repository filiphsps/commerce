import styles from '@/components/products/product-quantity-breaks.module.scss';

import type { Locale } from '@/utils/locale';
import type { HTMLProps } from 'react';

export type ProductQuantityBreaksItemProps = {
    quantity: number;
    currentQuantity: number;
} & HTMLProps<HTMLDivElement>;
export const ProductQuantityBreaksItem = ({
    quantity,
    currentQuantity,
    style,
    className,
    ...props
}: ProductQuantityBreaksItemProps) => {
    return (
        <div className={`${styles.item} ${quantity === currentQuantity ? styles.selected : ''}`} {...props}>
            <div className={styles.quantity}>{quantity}x</div>
            <div className={styles.percentage}>{Math.floor(quantity / 3.5)}%</div>
        </div>
    );
};

export type ProductQuantityBreaksProps = {
    currentQuantity: number;
    locale: Locale;
} & HTMLProps<HTMLDivElement>;
export const ProductQuantityBreaks = ({
    currentQuantity,
    locale,
    style,
    className,
    ...props
}: ProductQuantityBreaksProps) => {
    return <section className={styles.container} style={style}></section>;
};
