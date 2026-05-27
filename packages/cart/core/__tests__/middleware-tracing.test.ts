import { describe, expect, it } from 'vitest';
import { tracing } from '../src/middleware/tracing';
import type { ITracer } from '../src/types';

describe('tracing middleware', () => {
    it('opens span per mutation with kind, cartId, idempotencyKey', async () => {
        const records: Array<{ name: string; attrs: Record<string, unknown> }> = [];
        const tracer: ITracer = {
            async startSpan(name, attrs, fn) {
                records.push({ name, attrs });
                return fn({ recordException: () => {}, setAttribute: () => {} });
            },
        };
        const chain = tracing({ tracer })(async () => ({ id: 'cart-1' }) as never);
        await chain(
            { kind: 'add-line', variantId: 'v', quantity: 2 },
            {
                shop: {},
                locale: { language: 'en', country: 'US', currency: 'USD' },
                logger: console as never,
                idempotencyKey: 'idk-1',
                tracer,
            },
        );
        expect(records).toEqual([
            { name: 'cart.mutation.add-line', attrs: { 'mutation.kind': 'add-line', 'idempotency.key': 'idk-1' } },
        ]);
    });

    it('is a no-op if ctx.tracer is missing', async () => {
        const chain = tracing({})(async () => ({ id: 'x' }) as never);
        const r = await chain(
            { kind: 'remove-line', lineId: 'l1' },
            { shop: {}, locale: { language: 'en', country: 'US', currency: 'USD' }, logger: console as never },
        );
        expect(r).toEqual({ id: 'x' });
    });
});
