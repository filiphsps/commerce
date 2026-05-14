'use client';

import { useCart } from '@shopify/hydrogen-react';
import type { CartLine, ComponentizableCartLine } from '@shopify/hydrogen-react/storefront-api-types';
import type { HTMLProps, ReactNode } from 'react';
import { toast } from 'sonner';
import { CartSummary } from '@/components/cart/cart-summary';
import { useShop } from '@/components/shop/provider';
import { Checkout } from '@/utils/checkout';

import type { Locale, LocaleDictionary } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import { useTrackable } from '@/utils/trackable';

export type CartSidebarProps = {
    locale: Locale;
    i18n: LocaleDictionary;
    paymentMethods?: ReactNode;
} & HTMLProps<HTMLDivElement>;
export const CartSidebar = ({ i18n, locale, className, children, paymentMethods, ...props }: CartSidebarProps) => {
    const { shop } = useShop();

    const cart = useCart();
    const { status = 'fetching', cost, error: cartError } = cart;
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

                    // Don't bounce the user to Shopify checkout if Hydrogen-React
                    // is sitting on a `cart.error` from the last mutation —
                    // checkoutUrl reflects the last *successful* server-side
                    // cart, which can mean the wrong quantity or a sold-out
                    // line that's about to be stripped at checkout.
                    if (cartError != null) {
                        toast.error('Please review your cart — the last update did not complete.');
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
                            trackable: { queueEvent, postEvent },
                        });
                    } catch (error: unknown) {
                        console.error(error);
                        toast.error(error instanceof Error ? error.message : String(error));
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
