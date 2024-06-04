import styles from '@/components/products/product-quantity-breaks.module.scss';

import type { Locale } from '@/utils/locale';
import type { HTMLProps } from 'react';

export type ProductQuantityBreaksItemProps = {
    quantity: number;
    currentQuantity: number;
    setQuantity: (value: number) => void;
} & HTMLProps<HTMLDivElement>;
export const ProductQuantityBreaksItem = ({
    quantity,
    currentQuantity,
    setQuantity,
    style,
    className,
    ...props
}: ProductQuantityBreaksItemProps) => {
    return (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events
        <div
            role="button"
            className={`${styles.item} ${quantity === currentQuantity ? styles.selected : ''}`}
            {...props}
            onClick={() => setQuantity(quantity)}
        >
            <div className={styles.quantity}>{quantity}x</div>
            <div className={styles.percentage}>{Math.floor(quantity / 3.5)}%</div>
        </div>
    );
};

export type ProductQuantityBreaksProps = {
    currentQuantity: number;
    locale: Locale;
    setQuantity: (value: number) => void;
} & HTMLProps<HTMLDivElement>;
export const ProductQuantityBreaks = ({
    currentQuantity,
    setQuantity,
    locale,
    style,
    className,
    ...props
}: ProductQuantityBreaksProps) => {
    return (
        <section className={styles.container} style={style} {...props}>
            <ProductQuantityBreaksItem quantity={1} currentQuantity={currentQuantity} setQuantity={setQuantity} />
            <ProductQuantityBreaksItem quantity={10} currentQuantity={currentQuantity} setQuantity={setQuantity} />
            <ProductQuantityBreaksItem quantity={25} currentQuantity={currentQuantity} setQuantity={setQuantity} />
            <ProductQuantityBreaksItem quantity={50} currentQuantity={currentQuantity} setQuantity={setQuantity} />
            <ProductQuantityBreaksItem quantity={75} currentQuantity={currentQuantity} setQuantity={setQuantity} />
            <ProductQuantityBreaksItem quantity={100} currentQuantity={currentQuantity} setQuantity={setQuantity} />
        </section>
    );
};
