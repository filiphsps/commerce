import { describe, expect, it, vi } from 'vitest';
import fullFixture from '../src/__fixtures__/shopify-cart-full.json' with { type: 'json' };
import { createShopifyCartAdapter } from '../src/adapter';
import type { ShopifyTransport } from '../src/transport';

const baseCtx = {
    shop: {},
    locale: { language: 'en', country: 'US', currency: 'USD' },
    logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
    idempotencyKey: 'idk-1',
} as never;

function makeTransport(data: unknown): ShopifyTransport {
    return {
        query: vi.fn(async () => ({ data })),
        mutate: vi.fn(async () => ({ data })),
    };
}

describe('shopify cart adapter', () => {
    it('declares all capabilities true + a single customMutation', () => {
        const adapter = createShopifyCartAdapter({ transport: makeTransport({}) });
        expect(adapter.capabilities).toEqual({
            giftCards: true,
            multipleDiscountCodes: true,
            buyerIdentity: true,
            notes: true,
            cartAttributes: true,
            lineAttributes: true,
            customMutations: ['updateBuyerCountry'],
        });
    });

    it('getCart unwraps `{ data: { cart } }` envelope + normalizes', async () => {
        const transport = makeTransport({ cart: fullFixture });
        const adapter = createShopifyCartAdapter({ transport });
        const cart = await adapter.getCart(baseCtx, { cartId: 'gid://Cart/abc' });
        expect(cart).toBeTruthy();
        expect(cart?.providerType).toBe('shopify');
    });

    it('throws CartUserError when mutation returns non-empty userErrors', async () => {
        const transport: ShopifyTransport = {
            query: vi.fn(),
            mutate: vi.fn(async () => ({
                data: { cartLinesAdd: { cart: null, userErrors: [{ field: 'lineId', message: 'invalid' }] } },
            })),
        };
        const adapter = createShopifyCartAdapter({ transport });
        const promise = adapter.addLines(baseCtx, {
            cartId: 'gid://Cart/abc',
            lines: [{ variantId: 'v', quantity: 1 }],
        });
        await expect(promise).rejects.toMatchObject({ name: 'CartUserError' });
    });
});
