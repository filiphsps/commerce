'use client';

import styles from '@/components/cart/cart-lines.module.scss';

import { Suspense } from 'react';

import type { Shop } from '@nordcom/commerce-database';

import { useCart } from '@shopify/hydrogen-react';

import { CartLine } from '@/components/cart/cart-line';
import { Label } from '@/components/typography/label';

import type { LocaleDictionary } from '@/utils/locale';

type CartContentProps = {
    shop: Shop;
    i18n: LocaleDictionary;
};
const CartLines = ({ shop, i18n }: CartContentProps) => {
    const { status, lines } = useCart();

    const noItems = !lines || lines.length <= 0;

    if (['fetching', 'creating', 'uninitialized'].includes(status) && noItems) {
        return <CartLines.skeleton />;
    } else if (['idle'].includes(status) && noItems) {
        return <Label>There are no items in your cart.</Label>;
    }

    return (
        <Suspense key={`${shop.id}.cart.lines`} fallback={<CartLine.skeleton />}>
            <div className={styles.container}>
                {!noItems ? (
                    <>
                        {lines.map((item) => {
                            if (!item) return null;

                            return (
                                <Suspense key={`${shop.id}.cart.lines.${item.id}`} fallback={<CartLine.skeleton />}>
                                    <CartLine i18n={i18n} data={item as any} />
                                </Suspense>
                            );
                        })}
                    </>
                ) : null}
            </div>
        </Suspense>
    );
};

CartLines.skeleton = () => {
    return (
        <section className={styles.container}>
            <div className={`${styles['line-item']} ${styles.placeholder}`} />
            <div className={`${styles['line-item']} ${styles.placeholder}`} />
            <div className={`${styles['line-item']} ${styles.placeholder}`} />
        </section>
    );
};

CartLines.displayName = 'Nordcom.Cart.Lines';
export { CartLines };
