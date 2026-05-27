import { describe, expect, it } from 'vitest';
import { logger as loggerMiddleware } from '../src/middleware/logger';
import type { ILogger } from '../src/types';

describe('logger middleware', () => {
    it('logs entry and exit per mutation', async () => {
        const log: Array<{ level: string; msg: string }> = [];
        const ilog: ILogger = {
            debug: () => {},
            info: (msg) => log.push({ level: 'info', msg }),
            warn: () => {},
            error: () => {},
        };
        const chain = loggerMiddleware()(async () => ({ id: 'c1' }) as never);
        await chain(
            { kind: 'add-line', variantId: 'v1', quantity: 1 },
            { shop: {}, locale: { language: 'en', country: 'US', currency: 'USD' }, logger: ilog },
        );
        expect(log.map((l) => l.msg)).toEqual(['cart.mutation.start', 'cart.mutation.end']);
    });
});
