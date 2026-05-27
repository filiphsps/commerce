import { describe, expect, it, vi } from 'vitest';
import { memoryIdempotencyStore } from '../src/idempotency-store';
import { idempotency } from '../src/middleware/idempotency';
import type { Cart } from '../src/types';

const baseCtx = (key?: string) => ({
    shop: {},
    locale: { language: 'en', country: 'US', currency: 'USD' },
    logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
    idempotencyKey: key,
});

describe('idempotency middleware', () => {
    it('short-circuits same-key replay within window', async () => {
        const store = memoryIdempotencyStore();
        const inner = vi.fn(async () => ({ id: 'c1' }) as Cart);
        const chain = idempotency({ store, windowMs: 1_000 })(inner);
        await chain({ kind: 'add-line', variantId: 'v', quantity: 1 }, baseCtx('k1') as never);
        await chain({ kind: 'add-line', variantId: 'v', quantity: 1 }, baseCtx('k1') as never);
        expect(inner).toHaveBeenCalledTimes(1);
    });

    it('does not dedup mutations without a key', async () => {
        const store = memoryIdempotencyStore();
        const inner = vi.fn(async () => ({ id: 'c2' }) as Cart);
        const chain = idempotency({ store, windowMs: 1_000 })(inner);
        await chain({ kind: 'add-line', variantId: 'v', quantity: 1 }, baseCtx() as never);
        await chain({ kind: 'add-line', variantId: 'v', quantity: 1 }, baseCtx() as never);
        expect(inner).toHaveBeenCalledTimes(2);
    });

    it('expires entries after windowMs', async () => {
        vi.useFakeTimers();
        const store = memoryIdempotencyStore();
        const inner = vi.fn(async () => ({ id: 'c3' }) as Cart);
        const chain = idempotency({ store, windowMs: 1_000 })(inner);
        await chain({ kind: 'add-line', variantId: 'v', quantity: 1 }, baseCtx('k2') as never);
        vi.advanceTimersByTime(2_000);
        await chain({ kind: 'add-line', variantId: 'v', quantity: 1 }, baseCtx('k2') as never);
        expect(inner).toHaveBeenCalledTimes(2);
        vi.useRealTimers();
    });
});
