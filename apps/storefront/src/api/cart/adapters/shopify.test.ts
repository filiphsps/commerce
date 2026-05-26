import type { CartUserError } from '@nordcom/commerce-errors';
import { describe, expect, it, vi } from 'vitest';
import shopifyCartAdapter from './shopify';

vi.mock('@/api/shopify', () => ({
    ShopifyApolloApiClient: vi.fn(),
}));

const { ShopifyApolloApiClient } = await import('@/api/shopify');

const shop = { commerceProvider: { type: 'shopify' } } as any;
const locale = { code: 'en-US', country: 'US', language: 'EN' } as any;

const mkApi = (overrides: Partial<{ query: any; mutate: any }> = {}) => ({
    query: vi.fn().mockResolvedValue({ data: { cart: null } }),
    mutate: vi.fn().mockResolvedValue({ data: {} }),
    ...overrides,
});

const fakeCartResponse = {
    id: 'gid://shopify/Cart/abc',
    checkoutUrl: 'https://shop.example.com/checkout/abc',
    totalQuantity: 1,
    updatedAt: '2026-01-01T00:00:00Z',
    note: null,
    attributes: [],
    buyerIdentity: null,
    discountCodes: [],
    appliedGiftCards: [],
    cost: {
        subtotalAmount: { amount: '10.00', currencyCode: 'USD' },
        totalAmount: { amount: '10.00', currencyCode: 'USD' },
    },
    lines: { edges: [] },
};

function expectName(error: unknown, expected: string): void {
    expect((error as Error)?.name).toBe(expected);
}

describe('shopifyCartAdapter.getCart', () => {
    it('returns the normalized cart when present', async () => {
        const api = mkApi({ query: vi.fn().mockResolvedValue({ data: { cart: fakeCartResponse } }) });
        (ShopifyApolloApiClient as any).mockResolvedValueOnce(api);
        const cart = await shopifyCartAdapter.getCart({ cartId: 'gid://shopify/Cart/abc', shop, locale });
        expect(cart?.id).toBe('gid://shopify/Cart/abc');
        expect(api.query).toHaveBeenCalled();
    });

    it('throws CartNotFoundError when cart is null', async () => {
        (ShopifyApolloApiClient as any).mockResolvedValueOnce(mkApi());
        try {
            await shopifyCartAdapter.getCart({ cartId: 'gid://shopify/Cart/missing', shop, locale });
            expect.fail('should have thrown');
        } catch (e) {
            expectName(e, 'CartNotFoundError');
        }
    });

    it('wraps transport errors in CartProviderError', async () => {
        const api = { query: vi.fn().mockRejectedValue(new Error('fetch failed')) };
        (ShopifyApolloApiClient as any).mockResolvedValueOnce(api);
        try {
            await shopifyCartAdapter.getCart({ cartId: 'gid://shopify/Cart/abc', shop, locale });
            expect.fail('should have thrown');
        } catch (e) {
            expectName(e, 'CartProviderError');
        }
    });
});

describe('shopifyCartAdapter.createCart', () => {
    it('returns the normalized cart on success', async () => {
        const api = mkApi({
            mutate: vi.fn().mockResolvedValue({
                data: { cartCreate: { cart: { ...fakeCartResponse, id: 'gid://shopify/Cart/new' }, userErrors: [] } },
            }),
        });
        (ShopifyApolloApiClient as any).mockResolvedValueOnce(api);
        const cart = await shopifyCartAdapter.createCart({ shop, locale });
        expect(cart.id).toBe('gid://shopify/Cart/new');
    });

    it('throws CartUserError when userErrors are present', async () => {
        const api = mkApi({
            mutate: vi.fn().mockResolvedValue({
                data: { cartCreate: { cart: null, userErrors: [{ field: 'lines', message: 'Sold out' }] } },
            }),
        });
        (ShopifyApolloApiClient as any).mockResolvedValueOnce(api);
        try {
            await shopifyCartAdapter.createCart({ shop, locale });
            expect.fail('should have thrown');
        } catch (e) {
            expectName(e, 'CartUserError');
        }
    });
});

describe('shopifyCartAdapter mutations — happy paths', () => {
    const happyEnvelope = (key: string) => ({
        data: { [key]: { cart: fakeCartResponse, userErrors: [] } },
    });

    const cases: Array<[string, (api: any) => Promise<unknown>]> = [
        [
            'addLines / cartLinesAdd',
            (api) => {
                (ShopifyApolloApiClient as any).mockResolvedValueOnce(api);
                return shopifyCartAdapter.addLines({
                    cartId: 'c',
                    shop,
                    locale,
                    lines: [{ variantId: 'v', quantity: 1 }],
                });
            },
        ],
        [
            'updateLines / cartLinesUpdate',
            (api) => {
                (ShopifyApolloApiClient as any).mockResolvedValueOnce(api);
                return shopifyCartAdapter.updateLines({
                    cartId: 'c',
                    shop,
                    locale,
                    lines: [{ id: 'l', quantity: 2 }],
                });
            },
        ],
        [
            'removeLines / cartLinesRemove',
            (api) => {
                (ShopifyApolloApiClient as any).mockResolvedValueOnce(api);
                return shopifyCartAdapter.removeLines({ cartId: 'c', shop, locale, lineIds: ['l'] });
            },
        ],
        [
            'applyDiscountCodes / cartDiscountCodesUpdate',
            (api) => {
                (ShopifyApolloApiClient as any).mockResolvedValueOnce(api);
                return shopifyCartAdapter.applyDiscountCodes({ cartId: 'c', shop, locale, codes: ['SUMMER10'] });
            },
        ],
        [
            'applyGiftCardCodes / cartGiftCardCodesUpdate',
            (api) => {
                (ShopifyApolloApiClient as any).mockResolvedValueOnce(api);
                return shopifyCartAdapter.applyGiftCardCodes({ cartId: 'c', shop, locale, codes: ['GIFT'] });
            },
        ],
        [
            'removeGiftCardCodes / cartGiftCardCodesRemove',
            (api) => {
                (ShopifyApolloApiClient as any).mockResolvedValueOnce(api);
                return shopifyCartAdapter.removeGiftCardCodes({ cartId: 'c', shop, locale, ids: ['gid'] });
            },
        ],
        [
            'updateBuyerIdentity / cartBuyerIdentityUpdate',
            (api) => {
                (ShopifyApolloApiClient as any).mockResolvedValueOnce(api);
                return shopifyCartAdapter.updateBuyerIdentity({
                    cartId: 'c',
                    shop,
                    locale,
                    buyerIdentity: { email: 'a@b.com' },
                });
            },
        ],
        [
            'updateNote / cartNoteUpdate',
            (api) => {
                (ShopifyApolloApiClient as any).mockResolvedValueOnce(api);
                return shopifyCartAdapter.updateNote({ cartId: 'c', shop, locale, note: 'note' });
            },
        ],
        [
            'updateAttributes / cartAttributesUpdate',
            (api) => {
                (ShopifyApolloApiClient as any).mockResolvedValueOnce(api);
                return shopifyCartAdapter.updateAttributes({
                    cartId: 'c',
                    shop,
                    locale,
                    attributes: [{ key: 'k', value: 'v' }],
                });
            },
        ],
    ];

    for (const [name, runner] of cases) {
        it(`${name} returns normalized cart on success`, async () => {
            const mutationKey = name.split('/')[1]!.trim();
            const api = mkApi({ mutate: vi.fn().mockResolvedValue(happyEnvelope(mutationKey)) });
            const cart = await runner(api);
            expect((cart as any).id).toBe('gid://shopify/Cart/abc');
            expect(api.mutate).toHaveBeenCalled();
        });
    }
});

describe('shopifyCartAdapter mutations — userError + transport error coverage', () => {
    it('addLines: throws CartUserError for sold-out variant', async () => {
        const api = mkApi({
            mutate: vi.fn().mockResolvedValue({
                data: { cartLinesAdd: { cart: null, userErrors: [{ message: 'Sold out' }] } },
            }),
        });
        (ShopifyApolloApiClient as any).mockResolvedValueOnce(api);
        try {
            await shopifyCartAdapter.addLines({
                cartId: 'c',
                shop,
                locale,
                lines: [{ variantId: 'v', quantity: 1 }],
            });
            expect.fail('should have thrown');
        } catch (e) {
            expectName(e, 'CartUserError');
            expect((e as CartUserError).userErrors[0]!.message).toBe('Sold out');
        }
    });

    it('updateLines: wraps transport error in CartProviderError', async () => {
        const api = { mutate: vi.fn().mockRejectedValue(new Error('network down')) };
        (ShopifyApolloApiClient as any).mockResolvedValueOnce(api);
        try {
            await shopifyCartAdapter.updateLines({
                cartId: 'c',
                shop,
                locale,
                lines: [{ id: 'l', quantity: 1 }],
            });
            expect.fail('should have thrown');
        } catch (e) {
            expectName(e, 'CartProviderError');
        }
    });
});
