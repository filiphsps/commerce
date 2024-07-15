'use client';

import styles from '@/components/header/cart-button.module.scss';

import { FiShoppingBag } from 'react-icons/fi';

import { type Locale, type LocaleDictionary, useTranslation } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
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
            className={cn(
                'group',
                styles.container,
                'bg-transparent text-black',
                totalQuantity &&
                    'bg-primary text-primary-foreground hover:bg-secondary hover:text-secondary-foreground shadow-sm transition-all duration-150 hover:shadow-lg'
            )}
            data-items={totalQuantity || 0}
            title={t('view-cart')}
            suppressHydrationWarning={true}
        >
            <div
                className={cn(styles.quantity, 'group-hover:text-secondary-foreground')}
                suppressHydrationWarning={true}
            >
                {totalQuantity ? totalQuantity : null}
            </div>

            <FiShoppingBag className={cn(styles.icon, 'group-hover:text-secondary-foreground')} />
        </Link>
    );
};
CartButton.displayName = 'Nordcom.Header.CartButton';

export { CartButton };
