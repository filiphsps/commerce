import type { OnlineShop } from '@nordcom/commerce-db';
import { InvalidCartError, UnknownCommerceProviderError } from '@nordcom/commerce-errors';
import { trace } from '@opentelemetry/api';
import type { CartWithActions } from '@shopify/hydrogen-react';
import type { CartLine } from '@shopify/hydrogen-react/storefront-api-types';

import type { Locale } from '@/utils/locale';
import { productToMerchantsCenterId } from '@/utils/merchants-center-id';
import { safeParseFloat } from '@/utils/pricing';
import type { TrackableContextValue } from '@/utils/trackable';

// Const hacky workaround for ga4 cross-domain
// taken from StackOverflow
export const getCrossDomainLinkerParameter = (checkoutOrigin: string) => {
    // create form element, give it an action, make it hidden and prevent the submit event
    const formNode = document.createElement('form');
    formNode.action = checkoutOrigin;
    formNode.style.opacity = '0';
    formNode.addEventListener('submit', (event) => {
        event.preventDefault();
    });

    // create a button node, make it type=submit and append it to the form
    const buttonNode = document.createElement('button');
    buttonNode.type = 'submit';
    formNode.append(buttonNode);

    // append the form (and button) to the DOM
    document.body.append(formNode);

    try {
        // trigger a click on the button node to submit the form
        buttonNode.click();

        // check for the input[name=_gl] hidden input in the form (if decoration worked)
        const _glNode = formNode.querySelector<HTMLInputElement>('input[name="_gl"]');

        if (_glNode) {
            return _glNode.value;
        }

        // Dev-only diagnostic: helps identify GA4 cross-domain linker misconfiguration.
        // Absent _gl is non-fatal — checkout proceeds without the linker parameter.
        if (process.env.NODE_ENV !== 'production') {
            console.warn(
                `Could not find _gl input in checkout form with action "${formNode.action}" — proceeding without cross-domain linker.`,
            );
        }
        return null;
    } finally {
        // Always remove — the previous code left a hidden form attached to
        // `document.body` after every checkout click, leaking DOM nodes for
        // the lifetime of the session.
        formNode.remove();
    }
};

export const Checkout = async ({
    shop,
    locale,
    cart,
    trackable,
}: {
    shop: OnlineShop;
    locale: Locale;
    cart: CartWithActions;
    trackable: TrackableContextValue;
}) => {
    if (shop.commerceProvider.type !== 'shopify') {
        throw new UnknownCommerceProviderError();
    }

    if (typeof cart === 'undefined' || !cart) {
        throw new InvalidCartError('Cart is undefined or null');
    } else if (!cart.totalQuantity || cart.totalQuantity <= 0 || !cart.lines) {
        throw new InvalidCartError('Cart is empty');
    } else if (!cart.checkoutUrl) {
        throw new InvalidCartError('Cart is missing checkoutUrl');
    }

    // Prefer parsing the checkoutUrl over a regex rewrite. The previous regex
    // had an unescaped `.` and no anchor — so a checkoutUrl Shopify ever
    // returned in an unexpected shape (or a partial-string match like
    // `foo.myshopify.com.evil.com`) could produce a corrupt swap. Only swap
    // the host when it cleanly ends in `.myshopify.com`.
    let url: string;
    try {
        const parsed = new URL(cart.checkoutUrl);
        if (parsed.protocol !== 'https:') {
            throw new InvalidCartError(`Refusing non-https checkoutUrl: ${parsed.protocol}`);
        }
        if (parsed.hostname.endsWith('.myshopify.com')) {
            parsed.hostname = shop.commerceProvider.domain;
        }
        url = parsed.toString();
    } catch (err) {
        if (err instanceof InvalidCartError) throw err;
        throw new InvalidCartError(`Invalid checkoutUrl: ${cart.checkoutUrl}`);
    }

    // Drop lines whose variant has been deleted upstream — Shopify will strip
    // them at checkout but our analytics event would crash on the
    // non-null assertions below.
    const safeLines = (cart.lines.filter(Boolean) as CartLine[]).filter((line) => line.merchandise?.product);

    try {
        trackable.postEvent('begin_checkout', {
            gtm: {
                ecommerce: {
                    currency: cart.cost?.totalAmount?.currencyCode,
                    value: safeParseFloat(undefined, cart.cost?.totalAmount?.amount),
                    items: safeLines.flatMap((line) => {
                        const merchandise = line.merchandise;
                        const product = merchandise?.product;
                        if (!merchandise || !product) return [];
                        return [
                            {
                                item_id: productToMerchantsCenterId({
                                    locale: locale,
                                    product: {
                                        productGid: product.id,
                                        variantGid: merchandise.id,
                                    },
                                }),
                                item_name: product.title,
                                item_variant: merchandise.title,
                                item_brand: product.vendor,
                                item_category: product.productType || undefined,
                                sku: merchandise.sku || undefined,
                                product_id: product.id,
                                variant_id: merchandise.id,
                                currency: merchandise.price.currencyCode ?? '',
                                price: safeParseFloat(undefined, merchandise.price.amount),
                                quantity: line.quantity,
                            },
                        ];
                    }),
                },
            },
        });
    } catch (error: unknown) {
        trace.getActiveSpan()?.addEvent('checkout.analytics_event_failed', {
            'error.message': (error as Error)?.message ?? String(error),
        });
    }

    const ga4 = getCrossDomainLinkerParameter(`https://${shop.commerceProvider.domain}`);
    window.location.href = `${url}${ga4 ? `${url.includes('?') ? '&' : '?'}_gl=${ga4}` : ''}`;
};
