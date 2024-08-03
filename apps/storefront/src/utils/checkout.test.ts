import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OnlineShop } from '@nordcom/commerce-db';

import { Checkout } from '@/utils/checkout';
import { Locale } from '@/utils/locale';

import type { CartWithActions } from '@shopify/hydrogen-react';

describe('utils', () => {
    describe('checkout', () => {
        beforeEach(() => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});
            vi.spyOn(console, 'error').mockImplementation(() => {});
        });

        vi.mock('@/utils/build-config', () => ({
            BuildConfig: {
                shopify: {
                    domain: 'example.com',
                    checkout_domain: 'checkout.example.com'
                }
            }
        }));

        vi.mock('@/utils/pluralize', () => ({
            Pluralize: vi.fn(({ count, noun, suffix }) => `${count} ${noun}${count > 1 ? suffix : ''}`)
        }));

        vi.mock('@/utils/merchants-center-id', () => ({
            ProductToMerchantsCenterId: vi.fn(() => 'product-id')
        }));

        const cart: CartWithActions = {
            totalQuantity: 2,
            checkoutUrl: 'https://example.com/cart/checkout',
            lines: [
                {
                    merchandise: {
                        product: {
                            id: 'product-1',
                            title: 'Product 1',
                            vendor: 'Vendor 1'
                        },
                        id: 'variant-1',
                        title: 'Variant 1',
                        price: {
                            amount: '10.00',
                            currencyCode: 'USD'
                        }
                    },
                    quantity: 1
                },
                {
                    merchandise: {
                        product: {
                            id: 'product-2',
                            title: 'Product 2',
                            vendor: 'Vendor 2'
                        },
                        id: 'variant-2',
                        title: 'Variant 2',
                        price: {
                            amount: '20.00',
                            currencyCode: 'USD'
                        }
                    },
                    quantity: 1
                }
            ],
            cost: {
                totalAmount: {
                    amount: '30.00',
                    currencyCode: 'USD'
                }
            }
        } as any;

        const shop: OnlineShop = {
            commerceProvider: {
                type: 'shopify' as const,
                id: 'shopid',
                domain: 'checkout.sweetsideofsweden.com',
                storefrontId: 'Storefront Id',
                authentication: {
                    token: null,
                    publicToken: 'this-is-a-public-token'
                }
            }
        } as any;

        const trackable = {
            queueEvent: vi.fn(),
            postEvent: vi.fn()
        };

        const locale = Locale.from('en-US')!;

        beforeEach(() => {
            window.location.href = '';
        });

        it(`should throw an error when cart is empty`, async () => {
            const emptyCart: CartWithActions = {
                totalQuantity: 0,
                checkoutUrl: 'https://example.com/cart/checkout',
                lines: [],
                cost: {
                    totalAmount: {
                        amount: '0.00',
                        currencyCode: 'USD'
                    }
                }
            } as any;

            await expect(Checkout({ shop, locale, cart: emptyCart, trackable })).rejects.toThrow('Cart is empty!');
        });

        it(`should throw an error when cart is missing checkoutUrl`, async () => {
            const cartWithoutCheckoutUrl: CartWithActions = {
                totalQuantity: 2,
                checkoutUrl: '',
                lines: [
                    {
                        merchandise: {
                            product: {
                                id: 'product-1',
                                title: 'Product 1',
                                vendor: 'Vendor 1'
                            },
                            id: 'variant-1',
                            title: 'Variant 1',
                            price: {
                                amount: '10.00',
                                currencyCode: 'USD'
                            }
                        },
                        quantity: 1
                    }
                ],
                cost: {
                    totalAmount: {
                        amount: '10.00',
                        currencyCode: 'USD'
                    }
                }
            } as any;

            await expect(Checkout({ shop, locale, cart: cartWithoutCheckoutUrl, trackable })).rejects.toThrow(
                'Cart is missing checkoutUrl'
            );
        });

        it(`should track the begin_checkout event in Google Analytics`, async () => {
            const postEventSpy = vi.spyOn(trackable, 'postEvent');
            const expectedEventPayload = {
                path: '/en-US/checkout/',
                gtm: {
                    ecommerce: {
                        currency: 'USD',
                        value: 30,
                        items: [
                            {
                                currency: 'USD',
                                item_brand: 'Vendor 1',
                                item_category: undefined,
                                item_id: 'product-id',
                                item_name: 'Product 1',
                                item_variant: 'Variant 1',
                                price: 10,
                                product_id: 'product-1',
                                quantity: 1,
                                sku: undefined,
                                variant_id: 'variant-1'
                            },
                            {
                                currency: 'USD',
                                item_brand: 'Vendor 2',
                                item_category: undefined,
                                item_id: 'product-id',
                                item_name: 'Product 2',
                                item_variant: 'Variant 2',
                                price: 20,
                                product_id: 'product-2',
                                quantity: 1,
                                sku: undefined,
                                variant_id: 'variant-2'
                            }
                        ]
                    }
                }
            };

            await Checkout({ shop, locale, cart, trackable });

            expect(postEventSpy).toHaveBeenCalledWith('begin_checkout', expectedEventPayload);
        });
    });
});
