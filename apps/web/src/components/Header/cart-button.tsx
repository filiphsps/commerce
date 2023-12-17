'use client';

import styles from '@/components/Header/cart-button.module.scss';
import Link from '@/components/link';
import ShoppingBagIcon from '@/static/assets/icons/lottie/shopping-bag-light.json';
import { deepEqual } from '@/utils/deep-equal';
import { useTranslation, type Locale, type LocaleDictionary } from '@/utils/locale';
import { useCart } from '@shopify/hydrogen-react';
import dynamic from 'next/dynamic';
import { memo } from 'react';

const Lottie = dynamic(() => import('react-lottie-player'), {
    ssr: false,
    loading: () => null
});

/* c8 ignore start */
export type CartButtonProps = {
    locale: Locale;
    i18n: LocaleDictionary;
};
const CartButton = memo(({ locale, i18n }: CartButtonProps) => {
    const { totalQuantity /*, status*/ } = useCart();
    const { t } = useTranslation('cart', i18n);

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
            <Lottie
                className={styles.icon}
                animationData={ShoppingBagIcon}
                play={true}
                loop={false}
                useSubframes={true}
                suppressHydrationWarning={true}
            />
        </Link>
    );
}, deepEqual);

CartButton.displayName = 'Nordcom.Header.CartButton';
export { CartButton };
/* c8 ignore stop */
