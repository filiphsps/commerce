import { lexicalToProseMirror } from '@nordcom/commerce-cms/editor/richtext';
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import schema from '../../../convex/convex/schema';
import { seedCmsMutation } from './cms';
import { articleFixtures } from './fixtures/articles';
import { collectionMetadataFixtures } from './fixtures/collection-metadata';
import { featureFlagFixtures } from './fixtures/feature-flags';
import { pageFixtures } from './fixtures/pages';
import { productMetadataFixtures } from './fixtures/product-metadata';
import { lexicalDoc, list } from './fixtures/richtext';
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
    it('seeds the header/footer singletons scoped to the canonical shop id (no Payload, no tenant doc)', async () => {
        const t = convexTest(schema, modules);

        const shopId = await t.run((ctx) => seedShopMutation(asSeedCtx(ctx)));
        await t.run((ctx) => seedCmsMutation(asSeedCtx(ctx), { shopId }));

        const rows = await t.run(async (ctx) => ({
            header: await ctx.db.query('header').collect(),
            footer: await ctx.db.query('footer').collect(),
        }));

        // Exactly one of each singleton, scoped to the canonical shop id (the unified tenant key).
        expect(rows.header).toHaveLength(1);
        expect(rows.footer).toHaveLength(1);
        expect(rows.header[0]?.shop).toBe(shopId);
        expect(rows.footer[0]?.shop).toBe(shopId);
    });

    it('produces header/footer rows matching the storefront getHeader/getFooter read shape (non-null)', async () => {
        const t = convexTest(schema, modules);

        const shopId = await t.run((ctx) => seedShopMutation(asSeedCtx(ctx)));
        await t.run((ctx) => seedCmsMutation(asSeedCtx(ctx), { shopId }));

        const { header, footer } = await t.run(async (ctx) => ({
            header: await ctx.db
                .query('header')
                .withIndex('by_shop', (q) => q.eq('shop', shopId))
                .unique(),
            footer: await ctx.db
                .query('footer')
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
            pages: (await ctx.db.query('pages').collect()).length,
            articles: (await ctx.db.query('articles').collect()).length,
            productMetadata: (await ctx.db.query('productMetadata').collect()).length,
            collectionMetadata: (await ctx.db.query('collectionMetadata').collect()).length,
            featureFlags: (await ctx.db.query('featureFlags').collect()).length,
            shopFeatureFlags: (await ctx.db.query('shopFeatureFlags').collect()).length,
            cmsDocuments: (await ctx.db.query('cmsDocuments').collect()).length,
        }));

        expect(counts).toEqual({
            header: 1,
            footer: 1,
            pages: pageFixtures.length,
            articles: articleFixtures.length,
            productMetadata: productMetadataFixtures.length,
            collectionMetadata: collectionMetadataFixtures.length,
            featureFlags: featureFlagFixtures.length,
            shopFeatureFlags: featureFlagFixtures.length,
            // The flipped cohorts: the header/footer singletons (CUTOVER-04/06) + every page
            // (CUTOVER-04) plus every article and metadata overlay (CUTOVER-05) as live
            // editor-model rows.
            cmsDocuments:
                2 +
                pageFixtures.length +
                articleFixtures.length +
                productMetadataFixtures.length +
                collectionMetadataFixtures.length,
        });
    });

    it('seeds the CUTOVER-04 cohort (header + pages) as published, pointerless cmsDocuments rows', async () => {
        const t = convexTest(schema, modules);

        const shopId = await t.run((ctx) => seedShopMutation(asSeedCtx(ctx)));
        await t.run((ctx) => seedCmsMutation(asSeedCtx(ctx), { shopId }));

        const { headerDocs, pageDocs } = await t.run(async (ctx) => ({
            headerDocs: await ctx.db
                .query('cmsDocuments')
                .withIndex('by_shop_collection', (q) => q.eq('shopId', shopId).eq('collection', 'header'))
                .collect(),
            pageDocs: await ctx.db
                .query('cmsDocuments')
                .withIndex('by_shop_collection', (q) => q.eq('shopId', shopId).eq('collection', 'pages'))
                .collect(),
        }));

        // One live header singleton in the pointerless ETL/seed shape: `cms/read.ts` serves the
        // row's own `data` as the published content (no `publishedVersionId` snapshot to resolve).
        expect(headerDocs).toHaveLength(1);
        expect(headerDocs[0]?.status).toBe('published');
        expect(headerDocs[0]?.publishedVersionId).toBeUndefined();
        expect(headerDocs[0]?.data).toMatchObject({ logoLink: '/' });

        // Every page fixture lands as a live row keyed by its slug — what `cms/read:pages` and
        // `cms/read:pageBySlug` serve to the default-flipped storefront getters.
        const slugs = pageDocs.map((doc) => (doc.data as { slug?: string }).slug).sort();
        expect(slugs).toEqual(pageFixtures.map((page) => page.slug).sort());
        for (const doc of pageDocs) {
            expect(doc.status).toBe('published');
        }
    });

    it('seeds the CUTOVER-05 cohort (articles + metadata overlays) as published cmsDocuments rows on their natural keys', async () => {
        const t = convexTest(schema, modules);

        const shopId = await t.run((ctx) => seedShopMutation(asSeedCtx(ctx)));
        await t.run((ctx) => seedCmsMutation(asSeedCtx(ctx), { shopId }));

        const { articleDocs, productDocs, collectionDocs } = await t.run(async (ctx) => ({
            articleDocs: await ctx.db
                .query('cmsDocuments')
                .withIndex('by_shop_collection', (q) => q.eq('shopId', shopId).eq('collection', 'articles'))
                .collect(),
            productDocs: await ctx.db
                .query('cmsDocuments')
                .withIndex('by_shop_collection', (q) => q.eq('shopId', shopId).eq('collection', 'productMetadata'))
                .collect(),
            collectionDocs: await ctx.db
                .query('cmsDocuments')
                .withIndex('by_shop_collection', (q) => q.eq('shopId', shopId).eq('collection', 'collectionMetadata'))
                .collect(),
        }));

        // Every article fixture lands as a live row keyed by its slug — what `cms/read:articleBySlug`
        // and `cms/read:articles` serve to the default-flipped storefront getters — with the body
        // already in native ProseMirror shape for the storefront RichText renderer.
        const slugs = articleDocs.map((doc) => (doc.data as { slug?: string }).slug).sort();
        expect(slugs).toEqual(articleFixtures.map((article) => article.slug).sort());
        for (const doc of articleDocs) {
            expect(doc.status).toBe('published');
            expect(doc.publishedVersionId).toBeUndefined();
            expect((doc.data as { body?: { type?: string } }).body?.type).toBe('doc');
        }

        // The metadata overlays land keyed by their Shopify handle — the keyField the flipped
        // `cms/read:productMetadataByHandle`/`collectionMetadataByHandle` reads resolve by.
        const productHandles = productDocs.map((doc) => (doc.data as { shopifyHandle?: string }).shopifyHandle).sort();
        expect(productHandles).toEqual(productMetadataFixtures.map((overlay) => overlay.shopifyHandle).sort());
        const collectionHandles = collectionDocs
            .map((doc) => (doc.data as { shopifyHandle?: string }).shopifyHandle)
            .sort();
        expect(collectionHandles).toEqual(collectionMetadataFixtures.map((overlay) => overlay.shopifyHandle).sort());
        for (const doc of [...productDocs, ...collectionDocs]) {
            expect(doc.status).toBe('published');
        }
    });

    it('seeds the CUTOVER-06 cohort (footer singleton) as a published, pointerless cmsDocuments row', async () => {
        const t = convexTest(schema, modules);

        const shopId = await t.run((ctx) => seedShopMutation(asSeedCtx(ctx)));
        await t.run((ctx) => seedCmsMutation(asSeedCtx(ctx), { shopId }));

        const { footerDocs } = await t.run(async (ctx) => ({
            footerDocs: await ctx.db
                .query('cmsDocuments')
                .withIndex('by_shop_collection', (q) => q.eq('shopId', shopId).eq('collection', 'footer'))
                .collect(),
        }));

        // One live row for the singleton in the pointerless ETL/seed shape — what `cms/read:singleton`
        // serves to the default-flipped FooterApi getter.
        expect(footerDocs).toHaveLength(1);
        expect(footerDocs[0]?.status).toBe('published');
        expect(footerDocs[0]?.publishedVersionId).toBeUndefined();
        expect((footerDocs[0]?.data as { sections?: unknown[] }).sections).toHaveLength(4);
    });

    it('seeds the full pages/articles/productMetadata/collectionMetadata corpus scoped to the canonical shop id', async () => {
        const t = convexTest(schema, modules);

        const shopId = await t.run((ctx) => seedShopMutation(asSeedCtx(ctx)));
        await t.run((ctx) => seedCmsMutation(asSeedCtx(ctx), { shopId }));

        const rows = await t.run(async (ctx) => ({
            pages: await ctx.db
                .query('pages')
                .withIndex('by_shop', (q) => q.eq('shop', shopId))
                .collect(),
            articles: await ctx.db
                .query('articles')
                .withIndex('by_shop', (q) => q.eq('shop', shopId))
                .collect(),
            productMetadata: await ctx.db
                .query('productMetadata')
                .withIndex('by_shop', (q) => q.eq('shop', shopId))
                .collect(),
            collectionMetadata: await ctx.db
                .query('collectionMetadata')
                .withIndex('by_shop', (q) => q.eq('shop', shopId))
                .collect(),
        }));

        expect(rows.pages).toHaveLength(pageFixtures.length);
        expect(rows.articles).toHaveLength(articleFixtures.length);
        expect(rows.productMetadata).toHaveLength(productMetadataFixtures.length);
        expect(rows.collectionMetadata).toHaveLength(collectionMetadataFixtures.length);
        for (const collection of Object.values(rows)) {
            for (const row of collection) {
                expect(row.shop).toBe(shopId);
            }
        }
    });

    it('reassembles a seeded page and article through the by_shop read path with ProseMirror rich text present', async () => {
        const t = convexTest(schema, modules);

        const shopId = await t.run((ctx) => seedShopMutation(asSeedCtx(ctx)));
        await t.run((ctx) => seedCmsMutation(asSeedCtx(ctx), { shopId }));

        const { pages, articles } = await t.run(async (ctx) => ({
            pages: await ctx.db
                .query('pages')
                .withIndex('by_shop', (q) => q.eq('shop', shopId))
                .collect(),
            articles: await ctx.db
                .query('articles')
                .withIndex('by_shop', (q) => q.eq('shop', shopId))
                .collect(),
        }));

        // The storefront getPage equivalent: the tenant's `by_shop` range narrowed by slug. The real
        // SFREAD-12 getter is next wave; this pins the row it will reassemble from.
        const about = pages.find((page) => page.slug === 'about');
        expect(about).toBeDefined();
        expect(about?.title).toBe('About Nordcom');
        const richTextBlock = about?.blocks?.find((block: Record<string, unknown>) => block.blockType === 'rich-text');
        expect(richTextBlock).toBeDefined();
        expect(richTextBlock?.body?.type).toBe('doc');
        expect(richTextBlock?.body?.content?.[0]).toEqual({
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Our story' }],
        });

        const article = articles.find((row) => row.slug === 'behind-the-fw25-lookbook');
        expect(article).toBeDefined();
        expect(article?.author).toBe('Alma Henriksson');
        expect(article?.body?.type).toBe('doc');
        expect(article?.body?.content?.length).toBeGreaterThan(3);
        expect(article?.body?.content?.[1]).toEqual({
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Why Lofoten' }],
        });
    });

    it('stores metadata descriptionOverride bodies as codec-equivalent ProseMirror with no Lexical artifacts', async () => {
        const t = convexTest(schema, modules);

        const shopId = await t.run((ctx) => seedShopMutation(asSeedCtx(ctx)));
        await t.run((ctx) => seedCmsMutation(asSeedCtx(ctx), { shopId }));

        const { productMetadata, collectionMetadata } = await t.run(async (ctx) => ({
            productMetadata: await ctx.db
                .query('productMetadata')
                .withIndex('by_shop', (q) => q.eq('shop', shopId))
                .collect(),
            collectionMetadata: await ctx.db
                .query('collectionMetadata')
                .withIndex('by_shop', (q) => q.eq('shop', shopId))
                .collect(),
        }));

        const puffer = productMetadata.find((row) => row.shopifyHandle === 'puffer-jacket');
        expect(puffer?.descriptionOverride?.type).toBe('doc');
        const featured = collectionMetadata.find((row) => row.shopifyHandle === 'featured');
        expect(featured?.descriptionOverride?.type).toBe('doc');
        expect(featured?.descriptionOverride?.content?.[0]?.attrs).toEqual({ level: 1 });

        // Generator-equivalence: a seeded body is byte-identical to running the real CMSRICH-04 codec
        // over its Lexical authoring source, proving the fixtures flow through the codec, not a copy.
        const care = puffer?.blocks?.find((block: Record<string, unknown>) => block.blockType === 'rich-text');
        expect(care?.body).toEqual(
            lexicalToProseMirror(
                lexicalDoc([
                    list([
                        'Machine wash cold inside-out with like colours.',
                        'Tumble dry low or hang to dry.',
                        'Iron inverse if needed; no bleach.',
                    ]),
                ]),
            ),
        );

        // No Lexical serializer artifacts survive into storage — the storefront renderer is
        // ProseMirror-native, so a stray `root`/`listitem` shape would be unrenderable.
        const serialized = JSON.stringify({ productMetadata, collectionMetadata });
        expect(serialized).not.toContain('"root"');
        expect(serialized).not.toContain('"listitem"');
    });

    it('keeps the small fixture bodies INLINE on their rows: nothing shreds into cms_i18n', async () => {
        const t = convexTest(schema, modules);

        const shopId = await t.run((ctx) => seedShopMutation(asSeedCtx(ctx)));
        await t.run((ctx) => seedCmsMutation(asSeedCtx(ctx), { shopId }));

        const sideRows = await t.run((ctx) => ctx.db.query('cms_i18n').collect());
        expect(sideRows).toHaveLength(0);
    });
});
