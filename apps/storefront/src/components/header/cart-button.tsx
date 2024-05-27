'use client';

import styles from '@/components/header/cart-button.module.scss';

import { useEffect, useRef, useState } from 'react';
import { FiShoppingBag } from 'react-icons/fi';
import dynamic from 'next/dynamic';

import { type Locale, type LocaleDictionary, useTranslation } from '@/utils/locale';
import { useCart } from '@shopify/hydrogen-react';

import Link from '@/components/link';

const Lottie = dynamic(() => import('react-lottie-player'), {
    ssr: false,
    loading: () => null
});

/* c8 ignore start */
export type CartButtonProps = {
    locale: Locale;
    i18n: LocaleDictionary;
};
const CartButton = ({ locale, i18n }: CartButtonProps) => {
    const { t } = useTranslation('cart', i18n);
    const lottieRef = useRef<any>();
    const [previousQuantity, setPreviousQuantity] = useState<number>(0);
    const { totalQuantity } = useCart();

    useEffect(() => {
        if (lottieRef.current && totalQuantity !== undefined) {
            lottieRef.current.setDirection(1);

            if (totalQuantity <= 0) {
                // Close.
            } else if (previousQuantity <= 0) {
                lottieRef.current.goToAndPlay('morph-shopping-bag-open', false);
            } else if (totalQuantity > previousQuantity) {
                lottieRef.current.goToAndPlay('hover-shopping-bag-open', false);
            } else if (totalQuantity < previousQuantity) {
                // Remove.
            }
        }

        setPreviousQuantity(totalQuantity || 0);
    }, [totalQuantity]);

    // TODO: Proper animations.

    return (
        <Link
            href="/cart/"
            locale={locale}
            className={styles.container}
            data-items={totalQuantity || 0}
            title={t('view-cart')}
            suppressHydrationWarning={true}
        >
            <div className={styles.quantity} suppressHydrationWarning={true}>
                {totalQuantity ? totalQuantity : null}
            </div>
            <FiShoppingBag className={styles.icon} />
        </Link>
    );
};
CartButton.displayName = 'Nordcom.Header.CartButton';

export { CartButton };
