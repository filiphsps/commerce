import { createCart } from '@nordcom/cart-core';
import { createMockCartAdapter } from '@nordcom/cart-core/mock-adapter';
import { describe, expect, it } from 'vitest';

import { createCartEnsurer, createCartReader } from '../src/reader';
import type { CartIdStorage } from '../src/storage';

function makeStorage(initial: string | null): CartIdStorage {
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

const ctx = {
    shop: {},
    locale: { language: 'en', country: 'US', currency: 'USD' },
    logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
} as never;

describe('createCartReader', () => {
    it('returns null when no cart-id is stored', async () => {
        const adapter = createMockCartAdapter();
        const kernel = createCart({ adapter });
        const storage = makeStorage(null);
        const reader = createCartReader({ kernel, storage });
        expect(await reader(ctx)).toBeNull();
    });

    it('returns the cart when stored id resolves', async () => {
        const adapter = createMockCartAdapter();
        const kernel = createCart({ adapter });
        const created = await kernel.create(ctx, {});
        const storage = makeStorage(created.id);
        const reader = createCartReader({ kernel, storage });
        const result = await reader(ctx);
        expect(result?.id).toBe(created.id);
    });

    it('clears storage when cart is not found', async () => {
        const adapter = createMockCartAdapter();
        const kernel = createCart({ adapter });
        const storage = makeStorage('does-not-exist');
        const reader = createCartReader({ kernel, storage });
        expect(await reader(ctx)).toBeNull();
        expect(await storage.get()).toBeNull();
    });
});

describe('createCartEnsurer', () => {
    it('returns existing cart when reader finds one', async () => {
        const adapter = createMockCartAdapter();
        const kernel = createCart({ adapter });
        const created = await kernel.create(ctx, {});
        const storage = makeStorage(created.id);
        const reader = createCartReader({ kernel, storage });
        const ensure = createCartEnsurer({ kernel, storage, reader });
        const result = await ensure(ctx);
        expect(result.id).toBe(created.id);
    });

    it('creates new cart + stores id when nothing exists', async () => {
        const adapter = createMockCartAdapter();
        const kernel = createCart({ adapter });
        const storage = makeStorage(null);
        const reader = createCartReader({ kernel, storage });
        const ensure = createCartEnsurer({ kernel, storage, reader });
        const result = await ensure(ctx);
        expect(result.id).toBeTruthy();
        expect(await storage.get()).toBe(result.id);
    });
});
