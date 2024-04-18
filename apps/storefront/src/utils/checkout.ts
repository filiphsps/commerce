import type { Shop } from '@nordcom/commerce-database';

import { ProductToMerchantsCenterId } from '@/utils/merchants-center-id';

import type { Locale } from '@/utils/locale';
import type { TrackableContextValue } from '@/utils/trackable';
import type { CartWithActions } from '@shopify/hydrogen-react';
import type { CartLine } from '@shopify/hydrogen-react/storefront-api-types';

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
    return null; // TODO: Maybe throw an error here.
};

export const Checkout = async ({
    shop,
    locale,
    cart,
    trackable
}: {
    shop: Shop;
    locale: Locale;
    cart: CartWithActions;
    trackable: TrackableContextValue;
}) => {
    if (!cart.totalQuantity || cart.totalQuantity <= 0 || !cart.lines) throw new Error('Cart is empty!');
    else if (!cart.checkoutUrl) throw new Error('Cart is missing checkoutUrl');

    let url = cart.checkoutUrl;
    if (shop.commerceProvider.type === 'shopify') {
        url = url.replace(/[A-Za-z0-9\-\_]+.\.myshopify\.com/, `${shop.commerceProvider.domain}`);
    }

    try {
        trackable.postEvent('begin_checkout', {
            path: `/${locale.code}/checkout/`,
            gtm: {
                ecommerce: {
                    currency: cart.cost?.totalAmount?.currencyCode!,
                    value: Number.parseFloat(cart.cost?.totalAmount?.amount!),
                    items: (cart.lines.filter((_) => _) as CartLine[]).map((line) => ({
                        item_id: ProductToMerchantsCenterId({
                            locale: locale,
                            product: {
                                productGid: line.merchandise!.product!.id,
                                variantGid: line.merchandise!.id
                            } as any
                        }),
                        item_name: line.merchandise.product.title,
                        item_variant: line.merchandise.title,
                        item_brand: line.merchandise.product.vendor,
                        item_category: line.merchandise.product.productType,
                        sku: line.merchandise.sku || undefined,
                        product_id: line.merchandise!.product!.id,
                        variant_id: line.merchandise!.id,
                        currency: line.merchandise.price.currencyCode!,
                        price: Number.parseFloat(line.merchandise.price.amount!) || undefined,
                        quantity: line.quantity
                    }))
                }
            }
        });
    } catch (error) {
        console.error(error);
    }

    const ga4 = getCrossDomainLinkerParameter();
    const finalUrl = `${url}${(ga4 && `${(url.includes('?') && '&') || '?'}_gl=${ga4}`) || ''}`;
    window.location.href = finalUrl;
};