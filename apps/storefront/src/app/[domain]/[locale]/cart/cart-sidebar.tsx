'use client';

import { Checkout } from '@/utils/checkout';
import { cn } from '@/utils/tailwind';
import { useTrackable } from '@/utils/trackable';
import { useCart } from '@shopify/hydrogen-react';
import { toast } from 'sonner';

import { CartSummary } from '@/components/cart/cart-summary';
import { useShop } from '@/components/shop/provider';

import type { Locale, LocaleDictionary } from '@/utils/locale';
import type { CartLine, ComponentizableCartLine } from '@shopify/hydrogen-react/storefront-api-types';
import type { HTMLProps, ReactNode } from 'react';

export type CartSidebarProps = {
    locale: Locale;
    i18n: LocaleDictionary;
    paymentMethods?: ReactNode;
} & HTMLProps<HTMLDivElement>;
export const CartSidebar = ({ i18n, locale, className, children, paymentMethods, ...props }: CartSidebarProps) => {
    const { shop } = useShop();

    const cart = useCart();
    const { status = 'fetching', cost } = cart;
    const lines = (cart.lines || []).filter(Boolean) as Array<CartLine | ComponentizableCartLine>;

    const { queueEvent, postEvent } = useTrackable();

    return (
        <aside {...props} className={cn(className, 'block')}>
            <CartSummary
                shop={shop}
                onCheckout={async () => {
                    // TODO: i18n.
                    if (status !== 'idle') {
                        toast.error('The cart is still loading, please try again in a few seconds');
                        return;
                    }

                    if (!cost?.totalAmount || lines.length <= 0) {
                        return;
                    }

                    try {
                        await Checkout({
                            shop,
                            locale,
                            cart,
                            trackable: { queueEvent, postEvent }
                        });
                    } catch (error: unknown) {
                        console.error(error);
                        toast.error((error as any)?.message);
                    }
                }}
                i18n={i18n}
                paymentMethods={paymentMethods}
            >
                {children as any}
            </CartSummary>
        </aside>
    );
};
