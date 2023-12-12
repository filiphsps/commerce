'use client';

import styles from '@/components/Header/cart-button.module.scss';
import Link from '@/components/link';
import ShoppingBagIcon from '@/static/assets/icons/lottie/shopping-bag-light.json' assert { type: 'json' };
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { Player } from '@lottiefiles/react-lottie-player';
import { useCart } from '@shopify/hydrogen-react';

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
            <Player src={ShoppingBagIcon} className={styles.icon} keepLastFrame={true} autoplay />
        </Link>
    );
};
/* c8 ignore stop */
