'use client';

import type { Shop } from '@nordcom/commerce-database';

import { Checkout } from '@/utils/checkout';
import { cn } from '@/utils/tailwind';
import { useTrackable } from '@/utils/trackable';
import { useCart } from '@shopify/hydrogen-react';
import { toast } from 'sonner';

import { CartSummary } from '@/components/cart/cart-summary';

import type { StoreModel } from '@/models/StoreModel';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import type { HTMLProps } from 'react';

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
        <aside {...props} className={cn(className, 'block')}>
            <CartSummary
                shop={shop}
                onCheckout={async () => {
                    if (cart.status !== 'idle') {
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
