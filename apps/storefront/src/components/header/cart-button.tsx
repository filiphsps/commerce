'use client';

import styles from '@/components/header/cart-button.module.scss';

import { FiShoppingBag } from 'react-icons/fi';

import { getTranslations, type Locale, type LocaleDictionary } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import { useCart } from '@shopify/hydrogen-react';

import { Button } from '@/components/actionable/button';
import Link from '@/components/link';

export type CartButtonProps = {
    locale: Locale;
    i18n: LocaleDictionary;
};
const CartButton = ({ locale, i18n }: CartButtonProps) => {
    const { t } = getTranslations('cart', i18n);
    const { totalQuantity } = useCart();

    return (
        <Button
            as={Link}
            href="/cart/"
            locale={locale}
            className={cn(
                styles.container,
                'duration-250 group h-10 overflow-clip rounded-none bg-transparent p-0 py-0 transition-all *:leading-snug',
                totalQuantity &&
                    'bg-primary text-primary-foreground fill-primary-foreground stroke-primary-foreground rounded-3xl px-4 shadow transition-all',
                !totalQuantity && 'text-base text-black shadow-none hover:shadow-none'
            )}
            data-items={totalQuantity || 0}
            title={t('view-cart')}
        >
            <div
                className={cn(
                    styles.quantity,
                    'text-left text-base font-extrabold transition-all',
                    !totalQuantity && 'w-0'
                )}
                suppressHydrationWarning={true}
            >
                {totalQuantity ? totalQuantity : null}
            </div>

            <FiShoppingBag
                className={cn(
                    styles.icon,
                    'stroke-1 text-base transition-all',
                    !totalQuantity && 'group-hover:text-primary text-xl lg:text-2xl'
                )}
                suppressHydrationWarning={true}
            />
        </Button>
    );
};
CartButton.displayName = 'Nordcom.Header.CartButton';

export { CartButton };
