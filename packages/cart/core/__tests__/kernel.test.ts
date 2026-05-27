import { describe, expect, it, vi } from 'vitest';
import type { CartAdapter } from '../src/adapter';
import { CartCapabilityUnsupportedError } from '../src/errors';
import { createCart } from '../src/kernel';
import type { Cart } from '../src/types';

function makeAdapter(overrides: Partial<CartAdapter> = {}): CartAdapter {
    const cart = {
        id: 'c1',
        providerType: 'mock',
        totalQuantity: 0,
        checkoutUrl: null,
        lines: [],
        cost: { subtotal: { amount: '0', currencyCode: 'USD' }, total: null, tax: null, shipping: null },
        costStale: false,
        discountCodes: [],
        giftCards: [],
        buyerIdentity: null,
        note: null,
        attributes: [],
        updatedAt: '2026-01-01T00:00:00Z',
        custom: {},
    } as Cart;
    return {
        type: 'mock',
        capabilities: {
            giftCards: false,
            multipleDiscountCodes: false,
            buyerIdentity: false,
            notes: false,
            cartAttributes: false,
            lineAttributes: false,
            customMutations: [],
        },
        getCart: vi.fn(async () => cart),
        createCart: vi.fn(async () => cart),
        addLines: vi.fn(async () => cart),
        updateLines: vi.fn(async () => cart),
        removeLines: vi.fn(async () => cart),
        ...overrides,
    } as CartAdapter;
}

const baseCtx = () => ({
    shop: {},
    locale: { language: 'en', country: 'US', currency: 'USD' },
    logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
});

const flushMicrotasks = async () => {
    await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
    await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
};

describe('createCart kernel', () => {
    it('exposes adapter type + capabilities', () => {
        const adapter = makeAdapter();
        const kernel = createCart({ adapter });
        expect(kernel.type).toBe('mock');
        expect(kernel.capabilities).toBe(adapter.capabilities);
    });

    it('dispatches add-line mutation through adapter.addLines', async () => {
        const adapter = makeAdapter();
        const kernel = createCart({ adapter });
        await kernel.mutate(baseCtx() as never, { kind: 'add-line', variantId: 'v1', quantity: 2 });
        expect(adapter.addLines).toHaveBeenCalledWith(expect.anything(), {
            cartId: '',
            lines: [{ variantId: 'v1', quantity: 2, attributes: undefined }],
        });
    });

    it('throws CartCapabilityUnsupportedError when mutation needs a missing capability', async () => {
        const adapter = makeAdapter();
        const kernel = createCart({ adapter });
        await expect(
            kernel.mutate(baseCtx() as never, { kind: 'apply-gift-card', code: 'GC1' }),
        ).rejects.toBeInstanceOf(CartCapabilityUnsupportedError);
    });

    it('emits cart.updated after mutate', async () => {
        const adapter = makeAdapter();
        const kernel = createCart({ adapter });
        const seen: string[] = [];
        kernel.on('cart.updated', (e) => seen.push(e.cart.id));
        await kernel.mutate(baseCtx() as never, { kind: 'add-line', variantId: 'v', quantity: 1 });
        await flushMicrotasks();
        expect(seen).toEqual(['c1']);
    });

    it('routes kind: custom to adapter.customMutations[name]', async () => {
        const customHandler = vi.fn(async () => ({ id: 'c2' }) as Cart);
        const adapter = makeAdapter({
            capabilities: {
                giftCards: false,
                multipleDiscountCodes: false,
                buyerIdentity: false,
                notes: false,
                cartAttributes: false,
                lineAttributes: false,
                customMutations: ['ping'],
            },
            customMutations: { ping: customHandler },
        });
        const kernel = createCart({ adapter });
        await kernel.mutate(baseCtx() as never, { kind: 'custom', name: 'ping', payload: { x: 1 } });
        expect(customHandler).toHaveBeenCalled();
    });
});
