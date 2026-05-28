import { createCart } from '@nordcom/cart-core';
import { createMockCartAdapter } from '@nordcom/cart-core/mock-adapter';
import { describe, expect, it } from 'vitest';

import type { CartIdStorage } from '../src/storage';
import { createTypedCartActions } from '../src/typed-actions';

function makeStorage(initial: string | null = null): CartIdStorage {
    let value = initial;
    return {
        async get() {
            return value;
        },
        async set(id) {
            value = id;
        },
        async clear() {
            value = null;
        },
    };
}

const ctxBase = {
    shop: {},
    locale: { language: 'en', country: 'US', currency: 'USD' },
    logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
} as never;

describe('createTypedCartActions', () => {
    it('addLine creates cart on first add + stores id', async () => {
        const adapter = createMockCartAdapter();
        const kernel = createCart({ adapter });
        const storage = makeStorage();
        const actions = createTypedCartActions({
            kernel,
            storage,
            resolveContext: async (opts) => ({ ...ctxBase, idempotencyKey: opts?.idempotencyKey }),
        });
        const result = await actions.addLine({ variantId: 'v', quantity: 2, idempotencyKey: 'k1' });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.cart.totalQuantity).toBe(2);
            expect(await storage.get()).toBe(result.cart.id);
        }
    });

    it('returns ok:false on CartUserError with localized message via messageLocalizer', async () => {
        const failingAdapter = createMockCartAdapter({
            failOn: () =>
                Object.assign(new Error('user-error'), {
                    name: 'CartUserError',
                    userErrors: [{ message: 'invalid' }],
                }),
        });
        const kernel = createCart({ adapter: failingAdapter });
        const storage = makeStorage();
        const messageLocalizer = async (reason: string, raw?: string) => `[${reason}] ${raw ?? 'fallback'}`;
        const actions = createTypedCartActions({
            kernel,
            storage,
            resolveContext: async (opts) => ({ ...ctxBase, idempotencyKey: opts?.idempotencyKey }),
            messageLocalizer,
        });
        const result = await actions.addLine({ variantId: 'v', quantity: 1, idempotencyKey: 'k2' });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.reason).toBe('user-error');
            expect(result.message).toContain('user-error');
            expect(result.userErrors?.[0]?.message).toBe('invalid');
        }
    });

    it('dispatch routes to typed methods based on mutation.kind', async () => {
        const adapter = createMockCartAdapter();
        const kernel = createCart({ adapter });
        const storage = makeStorage();
        const actions = createTypedCartActions({
            kernel,
            storage,
            resolveContext: async (opts) => ({ ...ctxBase, idempotencyKey: opts?.idempotencyKey }),
        });
        await actions.addLine({ variantId: 'v', quantity: 1, idempotencyKey: 'k0' });
        const result = await actions.dispatch({
            mutation: { kind: 'update-note', note: 'hello' },
            idempotencyKey: 'k3',
        });
        expect(result.ok).toBe(true);
    });

    it('returns ok:false provider-error when resolveContext throws — does not let the error escape uncaught', async () => {
        const adapter = createMockCartAdapter();
        const kernel = createCart({ adapter });
        const storage = makeStorage();
        const actions = createTypedCartActions({
            kernel,
            storage,
            resolveContext: async () => {
                throw Object.assign(new Error('CartProviderError'), { name: 'CartProviderError' });
            },
        });
        const result = await actions.addLine({ variantId: 'v', quantity: 1, idempotencyKey: 'k-ctx-fail' });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.reason).toBe('provider-error');
        }
    });

    it('threads idempotencyKey into the resolved AdapterCtx', async () => {
        const adapter = createMockCartAdapter();
        const kernel = createCart({ adapter });
        const storage = makeStorage();
        const seenKeys: Array<string | undefined> = [];
        const actions = createTypedCartActions({
            kernel,
            storage,
            resolveContext: async (opts) => {
                seenKeys.push(opts?.idempotencyKey);
                return { ...ctxBase, idempotencyKey: opts?.idempotencyKey };
            },
        });
        await actions.addLine({ variantId: 'v', quantity: 1, idempotencyKey: 'idk-1' });
        expect(seenKeys).toContain('idk-1');
    });
});
