import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import schema from '../../../convex/convex/schema';
import { seedCmsMutation } from './cms';
import { featureFlagFixtures } from './fixtures/feature-flags';
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
 * The imported `schema` value is statically loosely typed (its table maps are `Record<string,
 * TableDefinition>`), so `t.run`'s context does not match the precisely-typed `MutationCtx` the seed
 * helpers expect. The runtime database still validates every insert against the real CMS validators, so
 * this cast is purely a static bridge — the validation the test asserts is unaffected.
 *
 * @param ctx - The loosely-typed mutation context handed in by `t.run`.
 * @returns The same context, typed as {@link seedCmsMutation}'s first parameter.
 */
function asSeedCtx(ctx: unknown): Parameters<typeof seedCmsMutation>[0] {
    return ctx as Parameters<typeof seedCmsMutation>[0];
}

describe('seedCmsMutation', () => {
    it('seeds the header/footer/businessData singletons scoped to the canonical shop id (no Payload, no tenant doc)', async () => {
        const t = convexTest(schema, modules);

        const shopId = await t.run((ctx) => seedShopMutation(asSeedCtx(ctx)));
        await t.run((ctx) => seedCmsMutation(asSeedCtx(ctx), { shopId }));

        const rows = await t.run(async (ctx) => ({
            header: await ctx.db.query('header').collect(),
            footer: await ctx.db.query('footer').collect(),
            businessData: await ctx.db.query('businessData').collect(),
        }));

        // Exactly one of each singleton, scoped to the canonical shop id (the unified tenant key).
        expect(rows.header).toHaveLength(1);
        expect(rows.footer).toHaveLength(1);
        expect(rows.businessData).toHaveLength(1);
        expect(rows.header[0]?.shop).toBe(shopId);
        expect(rows.footer[0]?.shop).toBe(shopId);
        expect(rows.businessData[0]?.shop).toBe(shopId);
    });

    it('produces header/footer rows matching the storefront getHeader/getFooter read shape (non-null)', async () => {
        const t = convexTest(schema, modules);

        const shopId = await t.run((ctx) => seedShopMutation(asSeedCtx(ctx)));
        await t.run((ctx) => seedCmsMutation(asSeedCtx(ctx), { shopId }));

        const { header, footer, businessData } = await t.run(async (ctx) => ({
            header: await ctx.db
                .query('header')
                .withIndex('by_shop', (q) => q.eq('shop', shopId))
                .unique(),
            footer: await ctx.db
                .query('footer')
                .withIndex('by_shop', (q) => q.eq('shop', shopId))
                .unique(),
            businessData: await ctx.db
                .query('businessData')
                .withIndex('by_shop', (q) => q.eq('shop', shopId))
                .unique(),
        }));

        // getHeader returns a `Header` doc: a populated mega-menu plus the locale switcher and CTA.
        expect(header).not.toBeNull();
        expect(header?.logoLink).toBe('/');
        expect(header?.items).toHaveLength(5);
        expect(header?.items?.[0]?.variant).toBe('editorial-columns');
        expect(header?.items?.[0]?.items).toHaveLength(4);
        expect(header?.localeSwitcher?.enabled).toBe(true);
        expect(header?.cta?.label).toBe('Sign up');

        // getFooter returns a `Footer` doc: content sections, socials, legal links, and a copyright line.
        expect(footer).not.toBeNull();
        expect(footer?.sections).toHaveLength(4);
        expect(footer?.social).toHaveLength(5);
        expect(footer?.legal).toHaveLength(5);
        expect(footer?.copyrightLine).toContain('Nordcom Demo Shop');

        // getBusinessData returns the structured-data surface the storefront SEO renderers interpolate.
        expect(businessData).not.toBeNull();
        expect(businessData?.legalName).toBe('Nordcom Demo Shop AB');
        expect(businessData?.address?.city).toBe('Stockholm');
        expect(businessData?.profiles).toHaveLength(4);
    });

    it('seeds global feature flags with native JSON values (no JSON.stringify) linked to the shop', async () => {
        const t = convexTest(schema, modules);

        const shopId = await t.run((ctx) => seedShopMutation(asSeedCtx(ctx)));
        await t.run((ctx) => seedCmsMutation(asSeedCtx(ctx), { shopId }));

        const { flags, links } = await t.run(async (ctx) => ({
            flags: await ctx.db.query('featureFlags').collect(),
            links: await ctx.db
                .query('shopFeatureFlags')
                .withIndex('by_shop', (q) => q.eq('shop', shopId))
                .collect(),
        }));

        // Every fixture flag is present and joined to the canonical shop.
        expect(flags).toHaveLength(featureFlagFixtures.length);
        expect(links).toHaveLength(featureFlagFixtures.length);

        // Values are stored NATIVELY — objects/booleans, not the Payload-era JSON.stringify strings.
        const crossTab = flags.find((flag) => flag.key === 'storefront.cart.cross-tab-sync');
        expect(crossTab).toBeDefined();
        expect(crossTab?.defaultValue).toEqual({ enabled: true });
        expect(typeof crossTab?.defaultValue).toBe('object');
        expect(crossTab?.options?.[0]?.value).toEqual({ enabled: true });
        expect(crossTab?.targeting?.[0]?.params).toEqual({ domains: ['nordcom-demo-shop.com'] });
    });

    it('is idempotent: a second run adds no duplicate documents', async () => {
        const t = convexTest(schema, modules);

        const shopId = await t.run((ctx) => seedShopMutation(asSeedCtx(ctx)));
        await t.run((ctx) => seedCmsMutation(asSeedCtx(ctx), { shopId }));
        await t.run((ctx) => seedCmsMutation(asSeedCtx(ctx), { shopId }));

        const counts = await t.run(async (ctx) => ({
            header: (await ctx.db.query('header').collect()).length,
            footer: (await ctx.db.query('footer').collect()).length,
            businessData: (await ctx.db.query('businessData').collect()).length,
            featureFlags: (await ctx.db.query('featureFlags').collect()).length,
            shopFeatureFlags: (await ctx.db.query('shopFeatureFlags').collect()).length,
        }));

        expect(counts).toEqual({
            header: 1,
            footer: 1,
            businessData: 1,
            featureFlags: featureFlagFixtures.length,
            shopFeatureFlags: featureFlagFixtures.length,
        });
    });
});
