import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import schema from '../../../convex/convex/schema';
import { seedCanonicalMutation } from './canonical';
import { articleFixtures } from './fixtures/articles';
import { collectionMetadataFixtures } from './fixtures/collection-metadata';
import { featureFlagFixtures } from './fixtures/feature-flags';
import { pageFixtures } from './fixtures/pages';
import { productMetadataFixtures } from './fixtures/product-metadata';
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

/**
 * Every table the canonical seed writes. The end-to-end no-op assertion snapshots ALL of them, so a
 * regression in ANY phase's idempotency guard (shop, credentials, domains, singletons, content corpus,
 * flags, flag links) shows up as a count delta here.
 */
const SEEDED_TABLES = [
    'shops',
    'shopCredentials',
    'shopDomains',
    'header',
    'footer',
    'businessData',
    'pages',
    'articles',
    'productMetadata',
    'collectionMetadata',
    'featureFlags',
    'shopFeatureFlags',
] as const;

/**
 * The imported `schema` value is statically loosely typed (its table maps are `Record<string,
 * TableDefinition>`), so `t.run`'s context does not match the precisely-typed `MutationCtx` the seed
 * helpers expect. The runtime database still validates every insert against the real validators, so this
 * cast is purely a static bridge — the behavior the test asserts is unaffected.
 *
 * @param ctx - The loosely-typed mutation context handed in by `t.run`.
 * @returns The same context, typed as {@link seedCanonicalMutation}'s first parameter.
 */
function asSeedCtx(ctx: unknown): Parameters<typeof seedCanonicalMutation>[0] {
    return ctx as Parameters<typeof seedCanonicalMutation>[0];
}

/**
 * Snapshots the row count of every canonical-seed table in one transaction, keyed by table name.
 *
 * @param t - The convex-test harness holding the deployment under test.
 * @returns Per-table row counts for all of {@link SEEDED_TABLES}.
 */
async function tableCounts(t: ReturnType<typeof convexTest>): Promise<Record<string, number>> {
    return await t.run(async (ctx) => {
        const counts: Record<string, number> = {};
        for (const table of SEEDED_TABLES) {
            counts[table] = (await ctx.db.query(table).collect()).length;
        }
        return counts;
    });
}

describe('seedCanonicalMutation', () => {
    it('first call seeds the shop plus credentials/domains/flags and the full CMS corpus', async () => {
        const t = convexTest(schema, modules);

        const shopId = await t.run((ctx) => seedCanonicalMutation(asSeedCtx(ctx)));

        expect(await tableCounts(t)).toEqual({
            shops: 1,
            shopCredentials: 1,
            shopDomains: 3,
            header: 1,
            footer: 1,
            businessData: 1,
            pages: pageFixtures.length,
            articles: articleFixtures.length,
            productMetadata: productMetadataFixtures.length,
            collectionMetadata: collectionMetadataFixtures.length,
            featureFlags: featureFlagFixtures.length,
            shopFeatureFlags: featureFlagFixtures.length,
        });

        // Every CMS document is scoped to the returned shop id — the unified tenant key.
        const scoped = await t.run(async (ctx) => ({
            header: await ctx.db.query('header').collect(),
            pages: await ctx.db.query('pages').collect(),
            articles: await ctx.db.query('articles').collect(),
        }));
        expect(scoped.header[0]?.shop).toBe(shopId);
        for (const row of [...scoped.pages, ...scoped.articles]) {
            expect(row.shop).toBe(shopId);
        }

        // The seeded rich-text bodies are ProseMirror-native, ready for the storefront renderer.
        const about = scoped.pages.find((page) => page.slug === 'about');
        const richTextBlock = about?.blocks?.find((block: Record<string, unknown>) => block.blockType === 'rich-text');
        expect(richTextBlock?.body?.type).toBe('doc');
    });

    it('returns the canonical shop id resolvable through the by_domain seam', async () => {
        const t = convexTest(schema, modules);

        const shopId = await t.run((ctx) => seedCanonicalMutation(asSeedCtx(ctx)));

        const byDomain = await t.run(async (ctx) =>
            ctx.db
                .query('shopDomains')
                .withIndex('by_domain', (q) => q.eq('domain', DEFAULT_SHOP_DOMAIN))
                .unique(),
        );
        expect(byDomain?.shop).toBe(shopId);
    });

    it('is an end-to-end no-op on the second call: same shop id, identical per-table counts', async () => {
        const t = convexTest(schema, modules);

        const first = await t.run((ctx) => seedCanonicalMutation(asSeedCtx(ctx)));
        const before = await tableCounts(t);

        const second = await t.run((ctx) => seedCanonicalMutation(asSeedCtx(ctx)));
        const after = await tableCounts(t);

        expect(second).toBe(first);
        expect(after).toEqual(before);
    });

    it('heals a partially-seeded deployment: a pre-existing shop gains the CMS corpus without duplication', async () => {
        const t = convexTest(schema, modules);

        // Simulate a deployment where only the shop phase ever ran (e.g. an interrupted first boot).
        const preSeeded = await t.run((ctx) => seedShopMutation(asSeedCtx(ctx)));

        const shopId = await t.run((ctx) => seedCanonicalMutation(asSeedCtx(ctx)));

        expect(shopId).toBe(preSeeded);
        const counts = await tableCounts(t);
        expect(counts.shops).toBe(1);
        expect(counts.pages).toBe(pageFixtures.length);
        expect(counts.articles).toBe(articleFixtures.length);
        expect(counts.featureFlags).toBe(featureFlagFixtures.length);
    });
});
