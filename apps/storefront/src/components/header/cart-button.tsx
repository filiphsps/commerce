'use client';

import styles from '@/components/header/cart-button.module.scss';

import { FiShoppingBag } from 'react-icons/fi';

import { type Locale, type LocaleDictionary, useTranslation } from '@/utils/locale';
import { useCart } from '@shopify/hydrogen-react';

import Link from '@/components/link';

export type CartButtonProps = {
    locale: Locale;
    i18n: LocaleDictionary;
};
const CartButton = ({ locale, i18n }: CartButtonProps) => {
    const { t } = useTranslation('cart', i18n);
    const { totalQuantity } = useCart();

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
