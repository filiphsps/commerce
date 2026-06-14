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

describe('seeded collaborators', () => {
    it('creates three users linked to the shop at admin/editor/viewer tiers, each with a session', async () => {
        const t = convexTest(schema, modules);
        const shopId = await t.run((ctx) => seedCanonicalMutation(asSeedCtx(ctx)));

        const users = await t.run((ctx) => ctx.db.query('users').collect());
        expect(users.map((u) => u.email).sort()).toEqual([
            'editor@nordcom-demo-shop.com',
            'owner@nordcom-demo-shop.com',
            'viewer@nordcom-demo-shop.com',
        ]);

        const allLinks = await t.run((ctx) => ctx.db.query('shopCollaborators').collect());
        const links = allLinks.filter((l) => l.shop === shopId);
        expect(links.map((l) => l.permissions.join(',')).sort()).toEqual(['admin', 'editor', 'viewer']);

        const sessions = await t.run((ctx) => ctx.db.query('sessions').collect());
        expect(sessions.length).toBe(3);
        const identities = await t.run((ctx) => ctx.db.query('identities').collect());
        expect(identities.length).toBe(3);
    });

    it('is idempotent — a second run adds no duplicate users or links', async () => {
        const t = convexTest(schema, modules);
        await t.run((ctx) => seedCanonicalMutation(asSeedCtx(ctx)));
        await t.run((ctx) => seedCanonicalMutation(asSeedCtx(ctx)));
        const users = await t.run((ctx) => ctx.db.query('users').collect());
        expect(users.length).toBe(3);
        // 3 tiers on the advanced shop + the owner's admin link on the minimal shop.
        const links = await t.run((ctx) => ctx.db.query('shopCollaborators').collect());
        expect(links.length).toBe(4);
    });
});
