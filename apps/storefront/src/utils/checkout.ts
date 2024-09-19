import type { OnlineShop } from '@nordcom/commerce-db';
import { InvalidCartError, UnknownCommerceProviderError } from '@nordcom/commerce-errors';

import { productToMerchantsCenterId } from '@/utils/merchants-center-id';
import { safeParseFloat } from '@/utils/pricing';

import type { Locale } from '@/utils/locale';
import type { TrackableContextValue } from '@/utils/trackable';
import type { CartWithActions } from '@shopify/hydrogen-react';
import type { CartLine } from '@shopify/hydrogen-react/storefront-api-types';

// Const hacky workaround for ga4 cross-domain
// taken from StackOverflow
export const getCrossDomainLinkerParameter = (domain: string) => {
    // create form element, give it an action, make it hidden and prevent the submit event
    const formNode = document.createElement('form') as any;
    formNode.action = `https://checkout.${domain}`; // TODO: This should be dependant on the tenant.
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

    if (_glNode) {
        return _glNode.value as string;
    }

    console.warn(`Could not find _gl input in checkout form with action "${formNode.action}"`);
    return null;
};

export const Checkout = async ({
    shop,
    locale,
    cart,
    trackable
}: {
    shop: OnlineShop;
    locale: Locale;
    cart: CartWithActions;
    trackable: TrackableContextValue;
}) => {
    if (shop.commerceProvider.type !== 'shopify') {
        throw new UnknownCommerceProviderError();
    }

    if (typeof (cart as any) === 'undefined' || !(cart as any)) {
        throw new InvalidCartError('Cart is undefined or null');
    } else if (!cart.totalQuantity || cart.totalQuantity <= 0 || !cart.lines) {
        throw new InvalidCartError('Cart is empty');
    } else if (!cart.checkoutUrl) {
        throw new InvalidCartError('Cart is missing checkoutUrl');
    }

    const url = cart.checkoutUrl.replace(/[A-Za-z0-9\-\_]+.\.myshopify\.com/, shop.commerceProvider.domain);

    try {
        trackable.postEvent('begin_checkout', {
            gtm: {
                ecommerce: {
                    currency: cart.cost?.totalAmount?.currencyCode!,
                    value: safeParseFloat(undefined, cart.cost?.totalAmount?.amount),
                    items: (cart.lines.filter((_) => _) as CartLine[]).map((line) => ({
                        item_id: productToMerchantsCenterId({
                            locale: locale,
                            product: {
                                productGid: line.merchandise!.product!.id,
                                variantGid: line.merchandise!.id
                            } as any
                        }),
                        item_name: line.merchandise.product.title,
                        item_variant: line.merchandise.title,
                        item_brand: line.merchandise.product.vendor,
                        item_category: line.merchandise.product.productType || undefined,
                        sku: line.merchandise.sku || undefined,
                        product_id: line.merchandise!.product!.id,
                        variant_id: line.merchandise!.id,
                        currency: line.merchandise.price.currencyCode!,
                        price: safeParseFloat(undefined, line.merchandise.price.amount),
                        quantity: line.quantity
                    }))
                }
            }
        });
    } catch (error: unknown) {
        console.error(error);
    }

    const ga4 = getCrossDomainLinkerParameter(shop.domain);
    window.location.href = `${url}${ga4 ? `${url.includes('?') ? '&' : '?'}_gl=${ga4}` : ''}`;
};
