import { describe, expect, it, vi } from 'vitest';
import { CartUserError } from '../src/errors';
import { analytics } from '../src/middleware/analytics';

const baseCtx = () => ({
    shop: { id: 'shop-1' },
    locale: { language: 'en', country: 'US', currency: 'USD' },
    logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
    idempotencyKey: 'idk-x',
});

describe('analytics middleware', () => {
    it('emits cart.mutation.success on resolve', async () => {
        const emit = vi.fn();
        const chain = analytics({ emit })(async () => ({ id: 'c1' }) as never);
        await chain({ kind: 'add-line', variantId: 'v', quantity: 1 }, baseCtx() as never);
        expect(emit).toHaveBeenCalledWith(
            'cart.mutation.success',
            expect.objectContaining({ kind: 'add-line', cartId: 'c1' }),
        );
    });

    it('emits cart.mutation.error on reject', async () => {
        const emit = vi.fn();
        const chain = analytics({ emit })(async () => {
            throw new CartUserError([{ message: 'nope' }]);
        });
        await expect(
            chain({ kind: 'add-line', variantId: 'v', quantity: 1 }, baseCtx() as never),
        ).rejects.toBeDefined();
        expect(emit).toHaveBeenCalledWith(
            'cart.mutation.error',
            expect.objectContaining({ kind: 'add-line', errorName: 'CartUserError' }),
        );
    });
});
