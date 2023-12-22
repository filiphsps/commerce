'use client';

import { CartLine } from '@/components/cart/cart-line';
import styles from '@/components/cart/cart-lines.module.scss';
import { Label } from '@/components/typography/label';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { useCart } from '@shopify/hydrogen-react';
import { Suspense } from 'react';
import styled from 'styled-components';

const NoItems = styled.div`
    display: flex;
    flex-shrink: 1;
    font-size: 1.25rem;
    color: var(--color-dark-secondary);

    & > div {
        padding: var(--block-padding) var(--block-padding-large);
        background: var(--color-block);
        border-radius: var(--block-border-radius);
        border: var(--block-border-width) solid var(--color-block-dark);
    }
`;

type CartContentProps = {
    locale: Locale;
    i18n: LocaleDictionary;
};
export default function CartLines({ locale, i18n }: CartContentProps) {
    const { status, lines } = useCart();

    const noItems = !lines || lines.length <= 0;

    if (['fetching', 'creating', 'uninitialized'].includes(status) && noItems) {
        return <CartLinesSkeleton />;
    } else if (['idle'].includes(status) && noItems) {
        return (
            <NoItems>
                <div>
                    <Label>There are no items in your cart.</Label>
                </div>
            </NoItems>
        );
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

                            return <CartLine key={item.id} i18n={i18n} data={item as any} />;
                        })}
                    </>
                ) : null}
            </Suspense>
        </div>
    );
}

export const CartLinesSkeleton = () => {
    return (
        <section className={styles.container}>
            {[...Array(3).keys()].map((i) => (
                <div key={i} className={`${styles['line-item']} ${styles.placeholder}`} />
            ))}
        </section>
    );
};
