import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import schema from '../../../convex/convex/schema';
import { seedCanonicalMutation } from './canonical';

const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
};

/** Static bridge: convex-test's loosely-typed ctx → the precisely-typed seed mutation ctx. */
function asSeedCtx(ctx: unknown): Parameters<typeof seedCanonicalMutation>[0] {
    return ctx as Parameters<typeof seedCanonicalMutation>[0];
}

describe('seeded domain statuses', () => {
    it('marks the alternative domains with verified/pending states', async () => {
        const t = convexTest(schema, modules);
        await t.run((ctx) => seedCanonicalMutation(asSeedCtx(ctx)));
        const rows = await t.run((ctx) => ctx.db.query('shopDomains').collect());
        const byDomain = new Map(rows.map((r) => [r.domain, r]));
        expect(byDomain.get('nordcom-demo-shop.com')?.status).toBe('verified');
        expect(byDomain.get('nordcom-demo-shop.com')?.via).toBe('service_domain');
        expect(byDomain.get('nordcom.shop')?.status).toBe('verified');
        expect(byDomain.get('demo.nordcom.commerce')?.status).toBe('pending');
    });
});
