'use client';

import { useCart } from '@nordcom/cart-react';
import { trace } from '@opentelemetry/api';
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

    const { cart, cartReady, error: cartError } = useCart();
    const lines = cart?.lines ?? [];
    const total = cart?.cost.total ?? null;

    const { queueEvent, postEvent } = useTrackable();

    return (
        <aside {...props} className={cn(className, 'block')}>
            <CartSummary
                shop={shop}
                onCheckout={async () => {
                    // TODO: i18n.
                    if (!cartReady) {
                        toast.error('The cart is still loading, please try again in a few seconds');
                        return;
                    }

                    // Don't bounce the user to Shopify checkout if we're
                    // sitting on a `cart.error` from the last mutation —
                    // checkoutUrl reflects the last *successful* server-side
                    // cart, which can mean the wrong quantity or a sold-out
                    // line that's about to be stripped at checkout.
                    if (cartError != null) {
                        toast.error('Please review your cart — the last update did not complete.');
                        return;
                    }

                    if (!total || lines.length <= 0) {
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
                        trace.getActiveSpan()?.addEvent('cart.checkout_failed', {
                            'error.message': (error as Error)?.message ?? String(error),
                        });
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
