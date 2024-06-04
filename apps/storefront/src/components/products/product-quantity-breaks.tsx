'use client';

import styles from '@/components/products/product-quantity-breaks.module.scss';

import { useQuantity } from './quantity-provider';

import type { HTMLProps } from 'react';

export type ProductQuantityBreaksItemProps = {
    requiredQuantity: number;
} & HTMLProps<HTMLButtonElement>;
export const ProductQuantityBreaksItem = ({
    requiredQuantity,
    style,
    className,
    ...props
}: ProductQuantityBreaksItemProps) => {
    const { quantity, setQuantity } = useQuantity();

    return (
        <button
            {...props}
            type="button"
            className={`${styles.item} ${requiredQuantity === quantity ? styles.selected : ''}`}
            onClick={() => setQuantity(requiredQuantity)}
        >
            <div className={styles.quantity}>{requiredQuantity}x</div>
            <div className={styles.percentage}>{Math.floor(requiredQuantity / 3.5)}%</div>
        </button>
    );
};
ProductQuantityBreaksItem.displayName = 'Nordcom.Products.QuantityBreaks.Item';

export type ProductQuantityBreaksProps = {} & HTMLProps<HTMLDivElement>;
export const ProductQuantityBreaks = ({ style, className, ...props }: ProductQuantityBreaksProps) => {
    return (
        <section className={styles.container} style={style} {...props}>
            <ProductQuantityBreaksItem requiredQuantity={1} />
            <ProductQuantityBreaksItem requiredQuantity={10} />
            <ProductQuantityBreaksItem requiredQuantity={25} />
            <ProductQuantityBreaksItem requiredQuantity={50} />
            <ProductQuantityBreaksItem requiredQuantity={75} />
            <ProductQuantityBreaksItem requiredQuantity={100} />
        </section>
    );
};
ProductQuantityBreaks.displayName = 'Nordcom.Products.QuantityBreaks';
