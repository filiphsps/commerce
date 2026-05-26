import type { OnlineShop } from '@nordcom/commerce-db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Cart } from '@/api/cart/types';
import { Checkout } from '@/utils/checkout';
import { Locale } from '@/utils/locale';

vi.mock('@/utils/build-config', () => ({
    BuildConfig: {
        shopify: {
            domain: 'example.com',
            checkout_domain: 'checkout.example.com',
        },
    },
}));

vi.mock('@/utils/pluralize', () => ({
    Pluralize: vi.fn(({ count, noun, suffix }) => `${count} ${noun}${count > 1 ? suffix : ''}`),
}));

vi.mock('@/utils/merchants-center-id', () => ({
    productToMerchantsCenterId: vi.fn(() => 'product-id'),
}));

describe('utils', () => {
    describe('checkout', () => {
        beforeEach(() => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});
            vi.spyOn(console, 'error').mockImplementation(() => {});
            window.location.href = '';
        });

        const cart: Cart = {
            id: 'gid://shopify/Cart/1',
            providerType: 'shopify',
            totalQuantity: 2,
            checkoutUrl: 'https://example.com/cart/checkout',
            lines: [
                {
                    id: 'line-1',
                    quantity: 1,
                    merchandise: {
                        id: 'variant-1',
                        productId: 'product-1',
                        productHandle: 'product-1',
                        productTitle: 'Product 1',
                        productVendor: 'Vendor 1',
                        productType: null,
                        variantTitle: 'Variant 1',
                        image: null,
                        selectedOptions: [],
                        unitPrice: { amount: '10.00', currencyCode: 'USD' },
                        compareAtUnitPrice: null,
                        availableForSale: true,
                        quantityAvailable: null,
                        sku: null,
                    },
                    cost: {
                        subtotal: { amount: '10.00', currencyCode: 'USD' },
                        total: { amount: '10.00', currencyCode: 'USD' },
                    },
                    attributes: [],
                    discountAllocations: [],
                },
                {
                    id: 'line-2',
                    quantity: 1,
                    merchandise: {
                        id: 'variant-2',
                        productId: 'product-2',
                        productHandle: 'product-2',
                        productTitle: 'Product 2',
                        productVendor: 'Vendor 2',
                        productType: null,
                        variantTitle: 'Variant 2',
                        image: null,
                        selectedOptions: [],
                        unitPrice: { amount: '20.00', currencyCode: 'USD' },
                        compareAtUnitPrice: null,
                        availableForSale: true,
                        quantityAvailable: null,
                        sku: null,
                    },
                    cost: {
                        subtotal: { amount: '20.00', currencyCode: 'USD' },
                        total: { amount: '20.00', currencyCode: 'USD' },
                    },
                    attributes: [],
                    discountAllocations: [],
                },
            ],
            cost: {
                subtotal: { amount: '30.00', currencyCode: 'USD' },
                total: { amount: '30.00', currencyCode: 'USD' },
                tax: null,
                shipping: null,
            },
            costStale: false,
            discountCodes: [],
            giftCards: [],
            buyerIdentity: null,
            note: null,
            attributes: [],
            updatedAt: '2026-05-26T00:00:00Z',
        };

        const shop: OnlineShop = {
            commerceProvider: {
                type: 'shopify' as const,
                id: 'shopid',
                domain: 'checkout.nordcom-demo-shop.com',
                storefrontId: 'Storefront Id',
                authentication: {
                    token: null,
                    publicToken: 'this-is-a-public-token',
                },
            },
        } as any;

        const trackable = {
            queueEvent: vi.fn(),
            postEvent: vi.fn(),
        };

        const locale = Locale.from('en-US')!;

        it(`should throw an error when cart is empty`, async () => {
            const emptyCart: Cart = {
                ...cart,
                totalQuantity: 0,
                lines: [],
            };

            await expect(Checkout({ shop, locale, cart: emptyCart, trackable })).rejects.toThrow();
        });

        it(`should throw an error when cart is missing checkoutUrl`, async () => {
            const cartWithoutCheckoutUrl: Cart = {
                ...cart,
                checkoutUrl: null,
            };

            await expect(Checkout({ shop, locale, cart: cartWithoutCheckoutUrl, trackable })).rejects.toThrow();
        });

        it(`should throw when cart is null`, async () => {
            await expect(Checkout({ shop, locale, cart: null, trackable })).rejects.toThrow();
        });

        it(`should throw when commerce provider is not shopify`, async () => {
            const nonShopifyShop = {
                ...shop,
                commerceProvider: { ...shop.commerceProvider, type: 'unknown' },
            } as any;
            await expect(Checkout({ shop: nonShopifyShop, locale, cart, trackable })).rejects.toThrow();
        });

        it(`navigates to the checkoutUrl after processing`, async () => {
            // The cart fixture uses 'example.com' (no myshopify domain) so it's kept as-is.
            await Checkout({ shop, locale, cart, trackable });
            expect(window.location.href).toContain('example.com/cart/checkout');
        });

        it(`replaces the myshopify domain in the checkout URL with the shop's commerce domain`, async () => {
            const cartWithMyshopify: Cart = {
                ...cart,
                checkoutUrl: 'https://my-store.myshopify.com/checkouts/1/abc123',
            };

            await Checkout({ shop, locale, cart: cartWithMyshopify, trackable });
            expect(window.location.href).not.toContain('myshopify.com');
            expect(window.location.href).toContain('checkout.nordcom-demo-shop.com');
        });

        it(`should track the begin_checkout event in Google Analytics`, async () => {
            const postEventSpy = vi.spyOn(trackable, 'postEvent');
            const expectedEventPayload = {
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
                                variant_id: 'variant-1',
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
                                variant_id: 'variant-2',
                            },
                        ],
                    },
                },
            };

            await Checkout({ shop, locale, cart, trackable });

            expect(postEventSpy).toHaveBeenCalledWith('begin_checkout', expectedEventPayload);
        });
    });
});
