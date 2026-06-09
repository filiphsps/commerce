import { makeFunctionReference } from 'convex/server';
import { convexTest } from 'convex-test';
import { afterEach, describe, expect, it } from 'vitest';

import schema from '../schema';
import { serverQuery } from './server';

/**
 * The Convex isolate tsconfig ships no `@types/node`, so `process` is not a known global at type level
 * (the production code bridges this in lib/env.ts). This test sets `CONVEX_SERVER_SECRET` directly to
 * drive {@link serverQuery}'s gate, so it declares the same minimal ambient `process` shape.
 */
declare const process: { env: Record<string, string | undefined> };

const SERVER_SECRET = 'test-server-secret-value';

/**
 * A {@link serverQuery} fixture that reads EVERY shop straight off the raw `ctx.db` with no tenant
 * filter — the cross-tenant read the identity-less `packages/db` seam needs (e.g. `Shop.findAll`). The
 * real constructor (its shared-secret gate plus the raw-db passthrough) is the code under test; the
 * required `serverSecret` arg is injected by the constructor, so the handler declares none of its own.
 */
const listAllShops = serverQuery({
    args: {},
    handler: async (ctx) => ctx.db.query('shops').collect(),
});

/**
 * convex-test resolves functions through a hand-built module map (see lib/system.test.ts for the full
 * rationale): the default glob excludes this self-importing module and Biome forbids exporting fixtures
 * from a test file, so the map points this module's path at the non-exported fixture above.
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/lib/server.test.ts': () => Promise.resolve({ listAllShops }),
};

const listAllShopsRef = makeFunctionReference<'query', { serverSecret: string }, Array<{ legacyId: string }>>(
    'lib/server.test:listAllShops',
);

/**
 * Inserts a shop row directly through convex-test's raw `ctx.db` (no constructor), under the given
 * domain/legacyId so the fixtures land in distinct tenant partitions.
 *
 * @param t - The convex-test harness.
 * @param key - A short discriminator used for the shop's `legacyId`, `name`, and `domain`.
 * @returns The inserted shop's id.
 */
function seedShop(t: ReturnType<typeof convexTest>, key: string): Promise<string> {
    const now = 1_700_000_000_000;
    return t.run((ctx) =>
        ctx.db.insert('shops', {
            legacyId: `shop_${key}`,
            name: key,
            domain: `${key}.example.com`,
            design: {
                header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: key } },
                accents: [],
            },
            commerceProvider: { type: 'stripe', authentication: {} },
            createdAt: now,
            updatedAt: now,
        }),
    );
}

describe('serverQuery shared-secret gate', () => {
    afterEach(() => {
        delete process.env.CONVEX_SERVER_SECRET;
    });

    it('returns rows across every tenant when the correct server secret is presented', async () => {
        process.env.CONVEX_SERVER_SECRET = SERVER_SECRET;
        const t = convexTest(schema, modules);
        await seedShop(t, 'alpha');
        await seedShop(t, 'beta');

        const shops = await t.query(listAllShopsRef, { serverSecret: SERVER_SECRET });

        // The raw, un-RLS-wrapped db returns BOTH tenants' rows — the cross-tenant access the seam needs.
        expect(shops).toHaveLength(2);
        expect(shops.map((shop) => shop.legacyId).sort()).toEqual(['shop_alpha', 'shop_beta']);
    });

    it('rejects a call presenting the wrong secret', async () => {
        process.env.CONVEX_SERVER_SECRET = SERVER_SECRET;
        const t = convexTest(schema, modules);
        await seedShop(t, 'alpha');

        await expect(t.query(listAllShopsRef, { serverSecret: 'wrong-secret' })).rejects.toThrow(
            /SERVER_SECRET_INVALID/,
        );
    });

    it('fails closed when the deployment has no server secret configured', async () => {
        const t = convexTest(schema, modules);
        await seedShop(t, 'alpha');

        await expect(t.query(listAllShopsRef, { serverSecret: SERVER_SECRET })).rejects.toThrow(
            /SERVER_SECRET_UNCONFIGURED/,
        );
    });
});
