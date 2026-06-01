import { ConvexError } from 'convex/values';

import type { Id } from '../../../convex/convex/_generated/dataModel';
import type { MutationCtx } from '../../../convex/convex/_generated/server';
import { businessDataFixture } from './fixtures/business-data';
import { featureFlagFixtures } from './fixtures/feature-flags';
import { footerData } from './fixtures/footer';
import { headerData } from './fixtures/header';

/**
 * Options for the over-the-wire {@link seedCms} stub. Carries the canonical shop id as a plain
 * string because the wire boundary (a deployed function reference) erases Convex's branded
 * `Id<'shops'>`. The in-isolate {@link seedCmsMutation} takes the branded id directly.
 *
 * @example
 * ```ts
 * await seedCms(url, { shopId });
 * ```
 */
export interface SeedCmsOptions {
    shopId: string;
}

/**
 * Options for {@link seedCmsMutation}. `shopId` is the canonical `Id<'shops'>` returned by
 * `seedShopMutation` — under the unified shop==tenant model (UNIFY-10) the shop row's own id IS the
 * multi-tenant tenant key, so every CMS document is scoped directly to it with no separate tenant doc.
 */
export interface SeedCmsMutationOptions {
    shopId: Id<'shops'>;
}

/**
 * The Convex seed mutation re-expressing Mongo's `seed/cms.ts` against the Convex-native CMS tables
 * (CMSDESC-02), with NO Payload boot: it inserts the `header`, `footer`, and `businessData` singletons
 * scoped to `shopId`, then seeds the platform-global `featureFlags` rows and links each to the canonical
 * shop via a `shopFeatureFlags` join row so the flags are genuinely scoped under the tenant.
 *
 * Two Payload-era quirks are dropped: there is no separate tenant document (shop == tenant, so docs key
 * straight on `shopId`), and feature-flag values are stored as NATIVE JSON rather than the
 * `JSON.stringify`d-for-Monaco payload the Payload `type: 'json'` field demanded (see the fixture note).
 *
 * Idempotent — the singletons are guarded by `by_shop`, each global flag by `by_key`, and each join by
 * `by_shop_flag`, so a second run is a no-op. Runs inside one Convex transaction, so all documents land
 * all-or-nothing.
 *
 * @param ctx - A Convex mutation context (raw `db` writer), e.g. from `convex-test`'s `run` or a
 *   registered seed mutation.
 * @param opts - The canonical shop id every CMS document is scoped to.
 * @returns Resolves once the CMS documents exist for the shop.
 */
export async function seedCmsMutation(ctx: MutationCtx, { shopId }: SeedCmsMutationOptions): Promise<void> {
    const now = Date.now();

    const existingHeader = await ctx.db
        .query('header')
        .withIndex('by_shop', (q) => q.eq('shop', shopId))
        .unique();
    if (!existingHeader) {
        await ctx.db.insert('header', { shop: shopId, ...headerData, createdAt: now, updatedAt: now });
    }

    const existingFooter = await ctx.db
        .query('footer')
        .withIndex('by_shop', (q) => q.eq('shop', shopId))
        .unique();
    if (!existingFooter) {
        await ctx.db.insert('footer', { shop: shopId, ...footerData, createdAt: now, updatedAt: now });
    }

    const existingBusinessData = await ctx.db
        .query('businessData')
        .withIndex('by_shop', (q) => q.eq('shop', shopId))
        .unique();
    if (!existingBusinessData) {
        await ctx.db.insert('businessData', { shop: shopId, ...businessDataFixture, createdAt: now, updatedAt: now });
    }

    for (const flag of featureFlagFixtures) {
        const existingFlag = await ctx.db
            .query('featureFlags')
            .withIndex('by_key', (q) => q.eq('key', flag.key))
            .unique();
        const flagId =
            existingFlag?._id ?? (await ctx.db.insert('featureFlags', { ...flag, createdAt: now, updatedAt: now }));

        const existingLink = await ctx.db
            .query('shopFeatureFlags')
            .withIndex('by_shop_flag', (q) => q.eq('shop', shopId).eq('flag', flagId))
            .unique();
        if (!existingLink) {
            await ctx.db.insert('shopFeatureFlags', { shop: shopId, flag: flagId });
        }
    }
}

/**
 * Live-backend transport wrapper around {@link seedCmsMutation}. Seeding a running deployment requires
 * invoking the seed mutation over the wire (a deployed function reference plus an authenticated client),
 * which HARNESS-02 wires into the launcher; until then this entry throws rather than silently skipping.
 *
 * @param url - Deployment URL the seed mutation runs against.
 * @param opts - The canonical shop id every CMS document is scoped to.
 * @returns Resolves once the CMS documents exist in the deployment.
 * @throws {ConvexError} Always, until HARNESS-02 wires the live mutation runner.
 */
export async function seedCms(url: string, opts: SeedCmsOptions): Promise<void> {
    throw new ConvexError(
        `@nordcom/commerce-test-convex: seedCms(${url}, ${JSON.stringify(opts)}) requires the HARNESS-02 live mutation runner; use seedCmsMutation(ctx, opts) directly against a Convex mutation context.`,
    );
}
