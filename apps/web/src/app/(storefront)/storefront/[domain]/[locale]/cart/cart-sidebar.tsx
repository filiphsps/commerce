'use client';

import type { Shop } from '@/api/shop';
import { CartSummary } from '@/components/CartSummary';
import styles from '@/components/typography/label.module.scss';
import { Checkout } from '@/utils/checkout';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { useCart } from '@shopify/hydrogen-react';
import type { HTMLProps } from 'react';

import { toast } from 'sonner';

export type CartSidebarProps = {
    shop: Shop;
    locale: Locale;
    i18n: LocaleDictionary;
} & HTMLProps<HTMLDivElement>;
export const CartSidebar = ({ shop, i18n, locale, className, ...props }: CartSidebarProps) => {
    const cart = useCart();

    return (
        <aside {...props} className={`${styles.container} ${className || ''}`}>
            <CartSummary
                onCheckout={async () => {
                    if (!['idle'].includes(cart.status)) {
                        toast.error('The cart is still loading, please try again in a few seconds'); // TODO: i18n.
                        return;
                    }

                    try {
                        await Checkout({
                            shop,
                            locale,
                            cart
                        });
                    } catch (error: any) {
                        console.error(error);
                        toast.error(error.message);
                    }
                }}
                i18n={i18n}
            />
        </aside>
    );
};
