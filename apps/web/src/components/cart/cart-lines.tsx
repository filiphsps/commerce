'use client';

import { CartLine } from '@/components/cart/cart-line';
import styles from '@/components/cart/cart-lines.module.scss';
import { Label } from '@/components/typography/label';
import type { LocaleDictionary } from '@/utils/locale';
import { useCart } from '@shopify/hydrogen-react';
import { Suspense } from 'react';

type CartContentProps = {
    i18n: LocaleDictionary;
};
const CartLines = ({ i18n }: CartContentProps) => {
    const { status, lines } = useCart();

    const noItems = !lines || lines.length <= 0;

    if (['fetching', 'creating', 'uninitialized'].includes(status) && noItems) {
        return <CartLines.skeleton />;
    } else if (['idle'].includes(status) && noItems) {
        return <Label>There are no items in your cart.</Label>;
    }

    return (
        <div className={styles.container}>
            <Suspense
                fallback={
                    <>
                        <CartLine.skeleton />
                    </>
                }
            >
                {!noItems ? (
                    <>
                        {lines?.map((item) => {
                            if (!item) return null;

                            return (
                                <Suspense key={item.id} fallback={<CartLine.skeleton />}>
                                    <CartLine i18n={i18n} data={item as any} />
                                </Suspense>
                            );
                        })}
                    </>
                ) : null}
            </Suspense>
        </div>
    );
};

CartLines.skeleton = () => {
    return (
        <section className={styles.container}>
            {[...Array(3).keys()].map((i) => (
                <div key={i} className={`${styles['line-item']} ${styles.placeholder}`} />
            ))}
        </section>
    );
};

CartLines.displayName = 'Nordcom.Cart.Lines';
export { CartLines };
