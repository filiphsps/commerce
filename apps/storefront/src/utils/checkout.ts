import type { CartLine, Money } from '@nordcom/cart-core';
import type { OnlineShop } from '@nordcom/commerce-db';
import { InvalidCartError, UnknownCommerceProviderError } from '@nordcom/commerce-errors';
import { isProduction } from '@nordcom/commerce-utils';
import { trace } from '@opentelemetry/api';

import type { Locale } from '@/utils/locale';
import { productToMerchantsCenterId } from '@/utils/merchants-center-id';
import { safeParseFloat } from '@/utils/pricing';
import type { TrackableContextValue } from '@/utils/trackable';

type CheckoutCart = {
    totalQuantity: number;
    lines: ReadonlyArray<CartLine<unknown>>;
    cost: { subtotal: Money | null; total: Money | null };
    checkoutUrl: string | null;
};

/**
 * Reads the GA4 cross-domain linker `_gl` parameter by submitting a hidden form against the checkout origin.
 *
 * @param checkoutOrigin - The full HTTPS URL of the checkout domain used as the form's `action`.
 * @returns The `_gl` linker string when GA4 has decorated the form, or `null` when the parameter is absent.
 */
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
        if (!isProduction()) {
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

/**
 * Fires a `begin_checkout` analytics event and redirects the browser to the Shopify checkout URL, swapping in the configured commerce domain.
 *
 * @param options.shop - The current tenant's shop record; must have a Shopify commerce provider.
 * @param options.locale - The active locale, used to build GA4 item IDs via `productToMerchantsCenterId`.
 * @param options.cart - The cart to check out; must be non-null, non-empty, and carry a valid HTTPS `checkoutUrl`.
 * @param options.trackable - Analytics context used to post the `begin_checkout` event before navigation.
 * @throws {UnknownCommerceProviderError} When the shop's commerce provider is not Shopify.
 * @throws {InvalidCartError} When the cart is null, empty, or missing a valid HTTPS `checkoutUrl`.
 */
export const Checkout = async ({
    shop,
    locale,
    cart,
    trackable,
}: {
    shop: OnlineShop;
    locale: Locale;
    cart: CheckoutCart | null;
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
    // them at checkout but our analytics event would crash on missing product
    // metadata below.
    const safeLines = cart.lines.filter((line) => line.merchandise?.productId);

    const totalMoney = cart.cost.total ?? cart.cost.subtotal;

    try {
        trackable.postEvent('begin_checkout', {
            gtm: {
                ecommerce: {
                    currency: totalMoney?.currencyCode,
                    value: safeParseFloat(undefined, totalMoney?.amount),
                    items: safeLines.flatMap((line) => {
                        const merchandise = line.merchandise;
                        if (!merchandise.productId) return [];
                        return [
                            {
                                item_id: productToMerchantsCenterId({
                                    locale: locale,
                                    product: {
                                        productGid: merchandise.productId,
                                        variantGid: merchandise.id,
                                    },
                                }),
                                item_name: merchandise.productTitle,
                                item_variant: merchandise.variantTitle,
                                item_brand: merchandise.productVendor ?? undefined,
                                item_category: merchandise.productType ?? undefined,
                                sku: merchandise.sku ?? undefined,
                                product_id: merchandise.productId,
                                variant_id: merchandise.id,
                                currency: merchandise.unitPrice.currencyCode,
                                price: safeParseFloat(undefined, merchandise.unitPrice.amount),
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
