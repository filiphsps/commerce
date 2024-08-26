'use client';

import styles from '@/components/header/cart-button.module.scss';

import { FiShoppingBag } from 'react-icons/fi';

import { type Locale, type LocaleDictionary, useTranslation } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import { useCart } from '@shopify/hydrogen-react';

import { Button } from '@/components/actionable/button';
import Link from '@/components/link';

export type CartButtonProps = {
    locale: Locale;
    i18n: LocaleDictionary;
};
const CartButton = ({ locale, i18n }: CartButtonProps) => {
    const { t } = useTranslation('cart', i18n);
    const { totalQuantity } = useCart();

    return (
        <Button
            as={Link}
            href="/cart/"
            locale={locale}
            className={cn(
                styles.container,
                'duration-250 group overflow-clip rounded-none bg-red-200 bg-transparent p-0 text-base text-black transition-all',
                totalQuantity &&
                    'bg-primary text-primary-foreground fill-primary-foreground stroke-primary-foreground hover:bg-secondary hover:text-secondary-foreground rounded-3xl px-4 py-3 shadow-sm transition-all duration-150 hover:shadow-lg'
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

            <FiShoppingBag
                className={cn(
                    styles.icon,
                    'group-hover:text-secondary-foreground text-xl transition-colors',
                    !totalQuantity && 'group-hover:text-primary text-xl lg:text-2xl'
                )}
                style={{ strokeWidth: 2.5 }}
            />
        </Button>
    );
};
CartButton.displayName = 'Nordcom.Header.CartButton';

export { CartButton };
