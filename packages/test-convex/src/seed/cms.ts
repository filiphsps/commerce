import { ConvexError } from 'convex/values';

import type { Id } from '../../../convex/convex/_generated/dataModel';
import type { MutationCtx } from '../../../convex/convex/_generated/server';
import { articleFixtures } from './fixtures/articles';
import { businessDataFixture } from './fixtures/business-data';
import { collectionMetadataFixtures } from './fixtures/collection-metadata';
import { featureFlagFixtures } from './fixtures/feature-flags';
import { footerData } from './fixtures/footer';
import { headerData } from './fixtures/header';
import { pageFixtures } from './fixtures/pages';
import { productMetadataFixtures } from './fixtures/product-metadata';

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
 * scoped to `shopId`, seeds the rich-text-bearing content collections (`pages`, `articles`,
 * `productMetadata`, `collectionMetadata`) under the same shop, then seeds the platform-global
 * `featureFlags` rows and links each to the canonical shop via a `shopFeatureFlags` join row so the
 * flags are genuinely scoped under the tenant.
 *
 * Two Payload-era quirks are dropped: there is no separate tenant document (shop == tenant, so docs key
 * straight on `shopId`), and feature-flag values are stored as NATIVE JSON rather than the
 * `JSON.stringify`d-for-Monaco payload the Payload `type: 'json'` field demanded (see the fixture note).
 * Rich-text bodies are stored as ProseMirror JSON produced by the real CMSRICH-04 codec (see
 * `fixtures/richtext.ts`), and the small fixture bodies stay INLINE on their rows — nothing is shredded
 * into `cms_i18n` (the shred path belongs to the `cmsDocuments` editor model, CMSDATA-10).
 *
 * The CUTOVER-04 gate cohort (`header` + `pages`) is ADDITIONALLY seeded as live `cmsDocuments`
 * rows — the editor-model table `cms/read.ts` serves — because those storefront getters are
 * Convex-native by default post-flip: without the rows the canonical tenant would render fallback
 * chrome and an empty pages surface under e2e. The rows use the pointerless ETL/seed shape
 * (`status: 'published'`, no `publishedVersionId`), for which the live `data` IS the published
 * content; CUTOVER-05/06 extend this block as their cohorts flip. The legacy mirror-table rows for
 * the cohort keep seeding alongside until TEARDOWN-03 retires the seed machinery.
 *
 * Idempotent — the singletons are guarded by `by_shop`, each content row by its natural key within the
 * shop's `by_shop` range (`slug` for pages/articles, `shopifyHandle` for the metadata overlays), the
 * cohort's `cmsDocuments` rows by `by_shop_collection` (+ `data.slug` for pages), each global flag by
 * `by_key`, and each join by `by_shop_flag`, so a second run is a no-op. Runs inside one Convex
 * transaction, so all documents land all-or-nothing.
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

    const existingPageSlugs = new Set(
        (
            await ctx.db
                .query('pages')
                .withIndex('by_shop', (q) => q.eq('shop', shopId))
                .collect()
        ).map((page) => page.slug),
    );
    for (const page of pageFixtures) {
        if (existingPageSlugs.has(page.slug)) continue;
        await ctx.db.insert('pages', { shop: shopId, ...page, createdAt: now, updatedAt: now });
    }

    const existingCohortHeader = await ctx.db
        .query('cmsDocuments')
        .withIndex('by_shop_collection', (q) => q.eq('shopId', shopId).eq('collection', 'header'))
        .unique();
    if (!existingCohortHeader) {
        await ctx.db.insert('cmsDocuments', {
            shopId,
            collection: 'header',
            data: { ...headerData },
            status: 'published',
            createdAt: now,
            updatedAt: now,
        });
    }

    const existingCohortPageSlugs = new Set(
        (
            await ctx.db
                .query('cmsDocuments')
                .withIndex('by_shop_collection', (q) => q.eq('shopId', shopId).eq('collection', 'pages'))
                .collect()
        ).map((doc) => (doc.data as { slug?: string }).slug),
    );
    for (const page of pageFixtures) {
        if (existingCohortPageSlugs.has(page.slug)) continue;
        await ctx.db.insert('cmsDocuments', {
            shopId,
            collection: 'pages',
            data: { ...page },
            status: 'published',
            createdAt: now,
            updatedAt: now,
        });
    }

    const existingArticleSlugs = new Set(
        (
            await ctx.db
                .query('articles')
                .withIndex('by_shop', (q) => q.eq('shop', shopId))
                .collect()
        ).map((article) => article.slug),
    );
    for (const article of articleFixtures) {
        if (existingArticleSlugs.has(article.slug)) continue;
        await ctx.db.insert('articles', { shop: shopId, ...article, createdAt: now, updatedAt: now });
    }

    const existingProductHandles = new Set(
        (
            await ctx.db
                .query('productMetadata')
                .withIndex('by_shop', (q) => q.eq('shop', shopId))
                .collect()
        ).map((row) => row.shopifyHandle),
    );
    for (const product of productMetadataFixtures) {
        if (existingProductHandles.has(product.shopifyHandle)) continue;
        await ctx.db.insert('productMetadata', { shop: shopId, ...product, createdAt: now, updatedAt: now });
    }

    const existingCollectionHandles = new Set(
        (
            await ctx.db
                .query('collectionMetadata')
                .withIndex('by_shop', (q) => q.eq('shop', shopId))
                .collect()
        ).map((row) => row.shopifyHandle),
    );
    for (const collection of collectionMetadataFixtures) {
        if (existingCollectionHandles.has(collection.shopifyHandle)) continue;
        await ctx.db.insert('collectionMetadata', { shop: shopId, ...collection, createdAt: now, updatedAt: now });
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
