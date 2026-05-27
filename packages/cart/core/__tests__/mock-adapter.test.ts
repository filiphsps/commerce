import { describe, expect, it } from 'vitest';
import { CartProviderError } from '../src/errors';
import { createMockCartAdapter } from '../src/mock-adapter';

const ctx = {
    shop: {},
    locale: { language: 'en', country: 'US', currency: 'USD' },
    logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
};

describe('mock cart adapter', () => {
    it('createCart + getCart round-trip', async () => {
        const adapter = createMockCartAdapter();
        const created = await adapter.createCart(ctx as never, {});
        expect(created.id).toMatch(/^mock-cart-/);
        expect(await adapter.getCart(ctx as never, { cartId: created.id })).toEqual(created);
    });

    it('addLines synthesizes line + bumps totalQuantity', async () => {
        const adapter = createMockCartAdapter();
        const c0 = await adapter.createCart(ctx as never, {});
        const c1 = await adapter.addLines(ctx as never, {
            cartId: c0.id,
            lines: [{ variantId: 'v1', quantity: 3 }],
        });
        expect(c1.lines).toHaveLength(1);
        expect(c1.lines[0]?.quantity).toBe(3);
        expect(c1.totalQuantity).toBe(3);
    });

    it('updateLines + removeLines mutate state', async () => {
        const adapter = createMockCartAdapter();
        const c0 = await adapter.createCart(ctx as never, {});
        const c1 = await adapter.addLines(ctx as never, {
            cartId: c0.id,
            lines: [{ variantId: 'v1', quantity: 1 }],
        });
        const lineId = c1.lines[0]?.id;
        expect(lineId).toBeDefined();
        const c2 = await adapter.updateLines(ctx as never, {
            cartId: c0.id,
            lines: [{ id: lineId as string, quantity: 5 }],
        });
        expect(c2.totalQuantity).toBe(5);
        const c3 = await adapter.removeLines(ctx as never, {
            cartId: c0.id,
            lineIds: [lineId as string],
        });
        expect(c3.lines).toHaveLength(0);
    });

    it('respects capability overrides — when giftCards=false, no applyGiftCardCodes method', () => {
        const adapter = createMockCartAdapter({ capabilities: { giftCards: false } });
        expect(adapter.applyGiftCardCodes).toBeUndefined();
    });

    it('failOn injects errors per mutation predicate', async () => {
        const adapter = createMockCartAdapter({
            failOn: (m) => (m.kind === 'add-line' ? new CartProviderError('forced') : null),
        });
        const c0 = await adapter.createCart(ctx as never, {});
        await expect(
            adapter.addLines(ctx as never, { cartId: c0.id, lines: [{ variantId: 'v', quantity: 1 }] }),
        ).rejects.toThrow(/forced/);
    });
});
