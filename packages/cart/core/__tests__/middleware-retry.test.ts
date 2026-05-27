import { describe, expect, it, vi } from 'vitest';
import { CartProviderError, CartUserError } from '../src/errors';
import { retry } from '../src/middleware/retry';

const baseCtx = () => ({
    shop: {},
    locale: { language: 'en', country: 'US', currency: 'USD' },
    logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
});

describe('retry middleware', () => {
    it('retries CartProviderError up to attempts', async () => {
        let calls = 0;
        const inner = vi.fn(async () => {
            calls++;
            if (calls < 3) throw new CartProviderError('boom');
            return { id: 'c' } as never;
        });
        const chain = retry({ attempts: 3, backoffMs: 0 })(inner);
        const r = await chain({ kind: 'add-line', variantId: 'v', quantity: 1 }, baseCtx() as never);
        expect(r.id).toBe('c');
        expect(inner).toHaveBeenCalledTimes(3);
    });

    it('does not retry CartUserError', async () => {
        const inner = vi.fn(async () => {
            throw new CartUserError([{ message: 'nope' }]);
        });
        const chain = retry({ attempts: 3, backoffMs: 0 })(inner);
        await expect(chain({ kind: 'add-line', variantId: 'v', quantity: 1 }, baseCtx() as never)).rejects.toThrow(
            /nope/,
        );
        expect(inner).toHaveBeenCalledTimes(1);
    });
});
