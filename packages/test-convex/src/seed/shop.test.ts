import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import schema from '../../../convex/convex/schema';
import { DEFAULT_SHOP_DOMAIN } from './fixtures/shop';
import { seedShopMutation } from './shop';

/**
 * convex-test resolves its module root from a `_generated` path. This package has no Convex functions of
 * its own, so the map carries only a dummy `_generated` key — enough for root detection — while the seed
 * runs through `t.run` (raw `db` access), which needs no resolved function module.
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
};

/** Every routable domain the canonical fixture should produce a `shopDomains` row for. */
const EXPECTED_DOMAINS = [DEFAULT_SHOP_DOMAIN, 'nordcom.shop', 'demo.nordcom.commerce'];

/**
 * The imported `schema` value is statically loosely typed (its table maps are `Record<string,
 * TableDefinition>`), so `t.run`'s context does not match the precisely-typed `MutationCtx`
 * {@link seedShopMutation} expects. The runtime database still validates every insert against the real
 * `shopValidator`/`shopCredentialsValidator`/`shopDomainValidator`, so this cast is purely a static
 * bridge — the validation the test asserts is unaffected.
 *
 * @param ctx - The loosely-typed mutation context handed in by `t.run`.
 * @returns The same context, typed as {@link seedShopMutation}'s first parameter.
 */
function asSeedCtx(ctx: unknown): Parameters<typeof seedShopMutation>[0] {
    return ctx as Parameters<typeof seedShopMutation>[0];
}

describe('seedShopMutation', () => {
    it('inserts the canonical shop with secrets split out and one domain row per routable domain', async () => {
        const t = convexTest(schema, modules);

        const shopId = await t.run((ctx) => seedShopMutation(asSeedCtx(ctx)));

        const rows = await t.run(async (ctx) => ({
            shops: await ctx.db.query('shops').collect(),
            credentials: await ctx.db.query('shopCredentials').collect(),
            domains: await ctx.db.query('shopDomains').collect(),
        }));

        // The validator accepted the fixture: exactly one shop row exists, with no dropped `contentProvider`.
        expect(rows.shops).toHaveLength(1);
        const shopRow = rows.shops[0];
        expect(shopRow?._id).toBe(shopId);
        const shopJson = JSON.stringify(shopRow);
        expect(shopJson).not.toContain('contentProvider');

        // Secrets land ONLY in shopCredentials, never on the public shop row.
        expect(shopJson).not.toContain('test-token');
        expect(rows.credentials).toHaveLength(1);
        const credentialsJson = JSON.stringify(rows.credentials[0]);
        expect(credentialsJson).toContain('test-token');

        // One shopDomains row per routable domain (primary plus each alternative).
        expect(rows.domains).toHaveLength(EXPECTED_DOMAINS.length);
        const seededDomains = rows.domains.map((row) => row.domain).sort();
        expect(seededDomains).toEqual([...EXPECTED_DOMAINS].sort());
    });

    it('resolves exactly one by_domain row per routable domain', async () => {
        const t = convexTest(schema, modules);
        await t.run((ctx) => seedShopMutation(asSeedCtx(ctx)));

        const perDomainCounts = await t.run(async (ctx) =>
            Promise.all(
                EXPECTED_DOMAINS.map(async (domain) => {
                    const matches = await ctx.db
                        .query('shopDomains')
                        .withIndex('by_domain', (q) => q.eq('domain', domain))
                        .collect();
                    return matches.length;
                }),
            ),
        );

        expect(perDomainCounts).toEqual(EXPECTED_DOMAINS.map(() => 1));
    });

    it('is idempotent: a second run is a no-op returning the same shop id', async () => {
        const t = convexTest(schema, modules);

        const first = await t.run((ctx) => seedShopMutation(asSeedCtx(ctx)));
        const second = await t.run((ctx) => seedShopMutation(asSeedCtx(ctx)));

        expect(second).toBe(first);

        const counts = await t.run(async (ctx) => ({
            shops: (await ctx.db.query('shops').collect()).length,
            credentials: (await ctx.db.query('shopCredentials').collect()).length,
            domains: (await ctx.db.query('shopDomains').collect()).length,
        }));

        expect(counts).toEqual({ shops: 1, credentials: 1, domains: EXPECTED_DOMAINS.length });
    });
});
