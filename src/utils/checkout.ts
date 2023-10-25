import { BuildConfig } from '@/utils/build-config';
import type { Locale } from '@/utils/locale';
import { ProductToMerchantsCenterId } from '@/utils/merchants-center-id';
import type { CartWithActions } from '@shopify/hydrogen-react';

// Const hacky workaround for ga4 cross-domain
// Ugly hack taken from StackOverflow
export const getCrossDomainLinkerParameter = () => {
    // create form element, give it an action, make it hidden and prevent the submit event
    const formNode = document.createElement('form') as any;
    formNode.action = 'https://opensource.sweetsideofsweden.com';
    formNode.style.opacity = '0';
    formNode.addEventListener('submit', (event: any) => {
        event.preventDefault();
    });

    // create a button node, make it type=submit and append it to the form
    const buttonNode = document.createElement('button') as any;
    buttonNode.type = 'submit';
    formNode.append(buttonNode);

    // append the form (and button) to the DOM
    document.body.append(formNode);

    // trigger a click on the button node to submit the form
    buttonNode.click();

    // check for the input[name=_gl] hidden input in the form (if decoration worked)
    const _glNode = formNode.querySelector('input[name="_gl"]') as any;

    if (_glNode) return _glNode.value as string;
    return null; // TODO: Throw error?
};

export const Checkout = async ({ cart, locale }: { cart: CartWithActions; locale: Locale }) => {
    if (!cart.totalQuantity || cart.totalQuantity <= 0 || !cart.lines) throw new Error('Cart is empty!');
    else if (!cart.checkoutUrl) throw new Error('Cart is missing checkoutUrl');

    const url = cart.checkoutUrl.replace(BuildConfig.shopify.domain, BuildConfig.shopify.checkout_domain);

    try {
        // Google Tracking
        (window as any).dataLayer?.push(
            {
                ecommerce: null
            },
            {
                event: 'begin_checkout',
                ecommerce: {
                    currency: cart.cost?.totalAmount?.currencyCode!,
                    value: Number.parseFloat(cart.cost?.totalAmount?.amount!),
                    items: cart.lines.map(
                        (line) =>
                            line && {
                                item_id: ProductToMerchantsCenterId({
                                    locale: locale,
                                    product: {
                                        productGid: line.merchandise!.product!.id,
                                        variantGid: line.merchandise!.id
                                    } as any
                                }),
                                item_name: line.merchandise?.product?.title,
                                item_variant: line.merchandise?.title,
                                item_brand: line.merchandise?.product?.vendor,
                                currency: line.merchandise?.price?.currencyCode!,
                                price: Number.parseFloat(line.merchandise?.price?.amount!) || undefined,
                                quantity: line.quantity
                            }
                    )
                }
            }
        );

        // Microsoft Ads tracking
        if ((window as any).uetq) {
            (window as any).uetq.push('event', 'begin_checkout', {
                ecomm_prodid: cart.lines.map((line) => line && line.merchandise?.id),
                ecomm_pagetype: 'cart',
                ecomm_totalvalue: Number.parseFloat(cart.cost?.totalAmount?.amount! || '0'),
                revenue_value: Number.parseFloat(cart.cost?.totalAmount?.amount! || '0'),
                currency: cart.cost?.totalAmount?.currencyCode!,
                items: cart.lines.map(
                    (line) =>
                        line && {
                            id: line.merchandise?.id,
                            quantity: line.quantity,
                            price: Number.parseFloat(line.merchandise?.price?.amount! || '0')
                        }
                )
            });
        }
    } catch {}

    const ga4 = getCrossDomainLinkerParameter();
    const finalUrl = `${url}${(ga4 && `${(url.includes('?') && '&') || '?'}_gl=${ga4}`) || ''}`;
    window.location.href = finalUrl;
};
