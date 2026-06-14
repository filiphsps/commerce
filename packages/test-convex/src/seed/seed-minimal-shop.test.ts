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

describe('seeded minimal second shop', () => {
    it('seeds minimal-demo.com as a distinct tenant with no CMS corpus', async () => {
        const t = convexTest(schema, modules);
        await t.run((ctx) => seedCanonicalMutation(asSeedCtx(ctx)));

        const shops = await t.run((ctx) => ctx.db.query('shops').collect());
        expect(shops.map((s) => s.domain).sort()).toEqual(['minimal-demo.com', 'nordcom-demo-shop.com']);
        // Distinct legacyIds so id-resolution never conflates the two tenants.
        expect(new Set(shops.map((s) => s.legacyId)).size).toBe(2);

        const minimal = shops.find((s) => s.domain === 'minimal-demo.com')!;
        const minimalPages = await t.run((ctx) => ctx.db.query('cmsDocuments').collect());
        expect(minimalPages.filter((p) => p.shopId === minimal._id).length).toBe(0);

        // The minimal shop carries its single domain only (no shared alternatives).
        const domains = await t.run((ctx) => ctx.db.query('shopDomains').collect());
        expect(domains.filter((d) => d.shop === minimal._id).map((d) => d.domain)).toEqual(['minimal-demo.com']);
    });

    it('is idempotent — a second run keeps exactly two shops', async () => {
        const t = convexTest(schema, modules);
        await t.run((ctx) => seedCanonicalMutation(asSeedCtx(ctx)));
        await t.run((ctx) => seedCanonicalMutation(asSeedCtx(ctx)));
        const shops = await t.run((ctx) => ctx.db.query('shops').collect());
        expect(shops.length).toBe(2);
    });
});
