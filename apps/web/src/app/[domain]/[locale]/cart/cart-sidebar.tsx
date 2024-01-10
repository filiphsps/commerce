'use client';

import { CartSummary } from '@/components/cart/cart-summary';
import styles from '@/components/typography/label.module.scss';
import type { StoreModel } from '@/models/StoreModel';
import { Checkout } from '@/utils/checkout';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { useTrackable } from '@/utils/trackable';
import type { Shop } from '@nordcom/commerce-database';
import { useCart } from '@shopify/hydrogen-react';
import type { HTMLProps } from 'react';

import { toast } from 'sonner';

export type CartSidebarProps = {
    shop: Shop;
    locale: Locale;
    i18n: LocaleDictionary;

    /** @deprecated */
    store: StoreModel;
} & HTMLProps<HTMLDivElement>;
export const CartSidebar = ({ shop, i18n, locale, store, className, ...props }: CartSidebarProps) => {
    const cart = useCart();
    const trackable = useTrackable();

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
                            cart,
                            trackable
                        });
                    } catch (error: any) {
                        console.error(error);
                        toast.error(error.message);
                    }
                }}
                i18n={i18n}
                store={store}
            />
        </aside>
    );
};
