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

/** Tables the enriched seed must populate across the advanced (+ minimal) shop. */
const POPULATED_TABLES = [
    'shops',
    'shopCredentials',
    'shopDomains',
    'shopCollaborators',
    'shopFeatureFlags',
    'featureFlags',
    'users',
    'sessions',
    'identities',
    'reviews',
    'media',
    'cmsDocuments',
    'cmsVersions',
] as const;

/** Snapshots every table's row count in one transaction. */
async function counts(t: ReturnType<typeof convexTest>): Promise<Record<string, number>> {
    return await t.run(async (ctx) => {
        const out: Record<string, number> = {};
        for (const table of POPULATED_TABLES) {
            out[table] = (await ctx.db.query(table).collect()).length;
        }
        return out;
    });
}

describe('enriched canonical seed', () => {
    it('populates every advanced-shop table', async () => {
        const t = convexTest(schema, modules);
        await t.run((ctx) => seedCanonicalMutation(asSeedCtx(ctx)));
        const snapshot = await counts(t);
        for (const table of POPULATED_TABLES) {
            expect(snapshot[table], `expected rows in ${table}`).toBeGreaterThan(0);
        }
    });

    it('is fully idempotent — a second run leaves every table count unchanged', async () => {
        const t = convexTest(schema, modules);
        await t.run((ctx) => seedCanonicalMutation(asSeedCtx(ctx)));
        const before = await counts(t);
        await t.run((ctx) => seedCanonicalMutation(asSeedCtx(ctx)));
        const after = await counts(t);
        expect(after).toEqual(before);
    });
});
