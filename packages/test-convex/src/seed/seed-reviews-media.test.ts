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

describe('seeded reviews + media', () => {
    it('seeds reviews and media rows scoped to the shop', async () => {
        const t = convexTest(schema, modules);
        const shopId = await t.run((ctx) => seedCanonicalMutation(asSeedCtx(ctx)));

        const reviews = await t.run((ctx) => ctx.db.query('reviews').collect());
        expect(reviews.length).toBeGreaterThanOrEqual(2);
        expect(reviews.every((r) => r.shopId === shopId)).toBe(true);

        const media = await t.run((ctx) => ctx.db.query('media').collect());
        expect(media.length).toBeGreaterThanOrEqual(2);
        expect(media.every((m) => m.shop === shopId)).toBe(true);
    });

    it('is idempotent — a second run does not duplicate reviews or media', async () => {
        const t = convexTest(schema, modules);
        await t.run((ctx) => seedCanonicalMutation(asSeedCtx(ctx)));
        const before = await t.run(async (ctx) => ({
            reviews: (await ctx.db.query('reviews').collect()).length,
            media: (await ctx.db.query('media').collect()).length,
        }));
        await t.run((ctx) => seedCanonicalMutation(asSeedCtx(ctx)));
        const after = await t.run(async (ctx) => ({
            reviews: (await ctx.db.query('reviews').collect()).length,
            media: (await ctx.db.query('media').collect()).length,
        }));
        expect(after).toEqual(before);
    });
});
