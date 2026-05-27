import { describe, expect, it } from 'vitest';
import type { CartMiddleware, MutationFn } from '../src/compose';
import { compose } from '../src/compose';
import type { CartMutation } from '../src/types';

const mut: CartMutation = { kind: 'add-line', variantId: 'v1', quantity: 1 };
const baseCtx = { shop: {}, locale: { language: 'en', country: 'US', currency: 'USD' }, logger: console as never };

describe('compose', () => {
    it('runs middleware in registration order, terminal returns cart', async () => {
        const log: string[] = [];
        const a: CartMiddleware = (next) => async (m, ctx) => {
            log.push('a:in');
            const r = await next(m, ctx);
            log.push('a:out');
            return r;
        };
        const b: CartMiddleware = (next) => async (m, ctx) => {
            log.push('b:in');
            const r = await next(m, ctx);
            log.push('b:out');
            return r;
        };
        const terminal: MutationFn = async () => ({ id: 'c1' }) as never;
        const chain = compose(a, b)(terminal);
        await chain(mut, baseCtx as never);
        expect(log).toEqual(['a:in', 'b:in', 'b:out', 'a:out']);
    });

    it('returns identity when no middleware passed', async () => {
        const terminal: MutationFn = async () => ({ id: 'x' }) as never;
        const chain = compose()(terminal);
        const r = await chain(mut, baseCtx as never);
        expect(r).toEqual({ id: 'x' });
    });
});
