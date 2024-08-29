'use client';

import { Checkout } from '@/utils/checkout';
import { cn } from '@/utils/tailwind';
import { useTrackable } from '@/utils/trackable';
import { useCart } from '@shopify/hydrogen-react';
import { toast } from 'sonner';

import { CartSummary } from '@/components/cart/cart-summary';
import { useShop } from '@/components/shop/provider';

import type { Locale, LocaleDictionary } from '@/utils/locale';
import type { HTMLProps, ReactNode } from 'react';

export type CartSidebarProps = {
    locale: Locale;
    i18n: LocaleDictionary;
    paymentMethods?: ReactNode;
} & HTMLProps<HTMLDivElement>;
export const CartSidebar = ({ i18n, locale, className, children, paymentMethods, ...props }: CartSidebarProps) => {
    const { shop } = useShop();
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
                paymentMethods={paymentMethods}
            >
                {children}
            </CartSummary>
        </aside>
    );
};
