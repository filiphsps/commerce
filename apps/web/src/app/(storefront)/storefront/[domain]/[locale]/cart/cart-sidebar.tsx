'use client';

import { CartSummary } from '@/components/CartSummary';
import styles from '@/components/typography/label.module.scss';
import { Checkout } from '@/utils/checkout';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { useCart } from '@shopify/hydrogen-react';
import type { HTMLProps } from 'react';

export type CartSidebarProps = {
    locale: Locale;
    i18n: LocaleDictionary;
} & HTMLProps<HTMLDivElement>;
export const CartSidebar = ({ i18n, locale, className, ...props }: CartSidebarProps) => {
    const cart = useCart();

    return (
        <aside {...props} className={`${styles.container} ${className || ''}`}>
            <CartSummary
                onCheckout={async () => {
                    // FIXME: User-feedback here.
                    if (!['idle', 'uninitialized'].includes(cart.status)) return;

                    try {
                        await Checkout({
                            cart,
                            locale
                        });
                    } catch (error: any) {
                        // FIXME: Also user-feedback here.
                        console.error(error);
                        alert(error.message);
                    }
                }}
                i18n={i18n}
            />
        </aside>
    );
};
