'use client';

import { Checkout } from '@/utils/checkout';
import { ProductToMerchantsCenterId } from '@/utils/merchants-center-id';
import { safeParseFloat } from '@/utils/pricing';
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
    const { status, cost } = cart;
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

                    if (!cost?.totalAmount || !lines) {
                        return;
                    }

                    try {
                        queueEvent('begin_checkout', {
                            gtm: {
                                ecommerce: {
                                    currency: cost.totalAmount.currencyCode,
                                    value: safeParseFloat(0, cost.totalAmount.amount),
                                    items: lines
                                        .map((_) => _ as Required<NonNullable<typeof _>>)
                                        .map((line) => {
                                            if (!line) {
                                                return null;
                                            }

                                            const { merchandise, quantity } = line;
                                            if (!merchandise) {
                                                return null;
                                            }

                                            const { product, price } = merchandise;
                                            if (!product) {
                                                return null;
                                            }

                                            return {
                                                item_id: ProductToMerchantsCenterId({
                                                    locale,
                                                    product: {
                                                        productGid: product.id!,
                                                        variantGid: merchandise.id!
                                                    }
                                                }),
                                                item_name: product.title,
                                                item_variant: merchandise.title,
                                                item_brand: product.vendor,
                                                item_category: product.productType || undefined,
                                                sku: merchandise.sku || undefined,
                                                currency: price.currencyCode,
                                                price: safeParseFloat(undefined, price.amount!),
                                                quantity: quantity
                                            };
                                        })
                                        .filter(Boolean)
                                        .map((_) => _ as Required<NonNullable<typeof _>>)
                                }
                            }
                        });

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
                {children}
            </CartSummary>
        </aside>
    );
};
