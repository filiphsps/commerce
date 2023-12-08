import type { Shop } from '@/api/shop';
import { Checkout } from '@/utils/checkout';
import { Locale } from '@/utils/locale';
import type { CartWithActions } from '@shopify/hydrogen-react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

        const shop: Shop = {
            configuration: {
                commerce: {
                    type: 'shopify' as const,
                    id: 'shopid',
                    domain: 'checkout.sweetsideofsweden.com',
                    storefrontId: 'Storefront Id',
                    authentication: {
                        token: null,
                        publicToken: 'this-is-a-public-token'
                    }
                }
            }
        } as any;

        const trackable = {
            queueEvent: vi.fn(),
            postEvent: vi.fn()
        };

        const locale = Locale.from('en-US')!;

        beforeEach(() => {
            (window as any).uetq = [];
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

        it.skip(`should track the begin_checkout event in Google Analytics`, async () => {
            await Checkout({ shop, locale, cart, trackable });

            expect((window as any).dataLayer).toContainEqual({
                event: 'begin_checkout',
                ecommerce: {
                    currency: 'USD',
                    value: 30,
                    items: [
                        {
                            item_id: 'product-id',
                            item_name: 'Product 1',
                            item_variant: 'Variant 1',
                            item_brand: 'Vendor 1',
                            currency: 'USD',
                            price: 10,
                            quantity: 1
                        },
                        {
                            item_id: 'product-id',
                            item_name: 'Product 2',
                            item_variant: 'Variant 2',
                            item_brand: 'Vendor 2',
                            currency: 'USD',
                            price: 20,
                            quantity: 1
                        }
                    ]
                }
            });
        });
    });
});
