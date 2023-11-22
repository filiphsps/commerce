'use client';

import styles from '@/components/Header/cart-button.module.scss';
import Link from '@/components/link';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { useCart } from '@shopify/hydrogen-react';
import { TbShoppingBag } from 'react-icons/tb';

/* c8 ignore start */
export type CartButtonProps = {
    locale: Locale;
    i18n: LocaleDictionary;
};
export const CartButton = ({ locale }: CartButtonProps) => {
    const { totalQuantity } = useCart();

    // TODO: i18n.
    return (
        <Link
            href="/cart/"
            locale={locale}
            className={`${styles.container}`}
            data-items={totalQuantity || 0}
            title="View your shopping cart"
        >
            <div className={styles.quantity}>{totalQuantity ? totalQuantity : null}</div>
            <TbShoppingBag className={styles.icon} />
        </Link>
    );
};
/* c8 ignore stop */
