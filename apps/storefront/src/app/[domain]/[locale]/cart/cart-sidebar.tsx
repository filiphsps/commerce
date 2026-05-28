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

/** Props for the `CartSidebar` client component. */
export type CartSidebarProps = {
    locale: Locale;
    i18n: LocaleDictionary;
    paymentMethods?: ReactNode;
} & HTMLProps<HTMLDivElement>;
/**
 * Client component rendering the cart order summary sidebar with a checkout
 * button. Guards checkout by refusing to proceed when the cart is still
 * loading or when the last mutation left an unresolved error.
 *
 * @param i18n - The locale dictionary for translated labels.
 * @param locale - The active locale forwarded to the checkout utility.
 * @param className - Additional class name applied to the outer `aside` element.
 * @param children - Optional content rendered inside the cart summary.
 * @param paymentMethods - Optional payment method badges rendered below the checkout button.
 * @returns The cart summary aside element, or `null` once the cart has settled empty.
 */
export const CartSidebar = ({ i18n, locale, className, children, paymentMethods, ...props }: CartSidebarProps) => {
    const { shop } = useShop();

    const { cart, cartReady, error: cartError } = useCart();
    const lines = cart?.lines ?? [];
    const total = cart?.cost.total ?? null;

    const { queueEvent, postEvent } = useTrackable();

    // Once the cart has settled empty, drop the summary entirely so the
    // empty-state placeholder in `CartLines` isn't paired with a dead-end
    // disabled-checkout panel. While the cart is still loading we keep it
    // mounted so its own loading treatment shows.
    if (cartReady && lines.length <= 0) {
        return null;
    }

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
