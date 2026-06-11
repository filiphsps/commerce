import { makeFunctionReference } from 'convex/server';
import { convexTest } from 'convex-test';
import { afterEach, describe, expect, it } from 'vitest';

import type { Id } from '../_generated/dataModel';
import schema from '../schema';
import * as read from './read';

/**
 * The Convex isolate tsconfig ships no `@types/node`, so `process` is not a known global at type
 * level (production code bridges this in lib/env.ts); declare the minimal ambient shape the
 * server-secret gate reads.
 */
declare const process: { env: Record<string, string | undefined> };

const SERVER_SECRET = 'test-server-secret-value';
const SHOP_PUBLIC_ID = 'shop_legacy_public_id';
const NOW = 1_700_000_000_000;

/**
 * convex-test resolves functions through a hand-built module map (see lib/system.test.ts for the
 * rationale); point the real `cms/read` module at its deployed path so the secret-gated storefront
 * reads under test run exactly as deployed.
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/cms/read.ts': () => Promise.resolve(read),
};

type DocResult = Record<string, unknown> | null;
type ListResult = { docs: Record<string, unknown>[] };

const singletonRef = makeFunctionReference<'query', Record<string, unknown>, DocResult>('cms/read:singleton');
const pageBySlugRef = makeFunctionReference<'query', Record<string, unknown>, DocResult>('cms/read:pageBySlug');
const pagesRef = makeFunctionReference<'query', Record<string, unknown>, ListResult>('cms/read:pages');
const articleBySlugRef = makeFunctionReference<'query', Record<string, unknown>, DocResult>('cms/read:articleBySlug');
const articlesRef = makeFunctionReference<'query', Record<string, unknown>, ListResult>('cms/read:articles');
const productMetadataRef = makeFunctionReference<'query', Record<string, unknown>, DocResult>(
    'cms/read:productMetadataByHandle',
);
const recordDivergenceRef = makeFunctionReference<'mutation', Record<string, unknown>, null>(
    'cms/read:recordDivergence',
);

/**
 * Seeds the canonical read corpus: one shop (public id ≠ Convex id, default locale `en-US`) plus
 * published `cmsDocuments` rows for a header singleton, a locale-bucketed page, an article whose
 * `body` buckets are shredded into `cms_i18n`, a bucketed product-metadata overlay, an
 * UNBUCKETED (HARNESS-12-style) page, and one draft page that must stay invisible.
 *
 * @param t - The convex-test harness.
 * @returns The seeded shop's Convex id.
 */
function seedCorpus(t: ReturnType<typeof convexTest>): Promise<Id<'shops'>> {
    return t.run(async (ctx) => {
        const shopId = await ctx.db.insert('shops', {
            legacyId: SHOP_PUBLIC_ID,
            name: 'Acme',
            domain: 'acme.example.com',
            i18n: { defaultLocale: 'en-US' },
            design: {
                header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: 'Acme' } },
                accents: [],
            },
            commerceProvider: { type: 'stripe', authentication: {} },
            createdAt: NOW,
            updatedAt: NOW,
        });

        await ctx.db.insert('cmsDocuments', {
            shopId,
            collection: 'header',
            data: { logoLink: '/', items: [{ link: { kind: 'external', label: 'Shop', url: '/shop/' } }] },
            status: 'published',
            createdAt: NOW,
            updatedAt: NOW,
        });

        await ctx.db.insert('cmsDocuments', {
            shopId,
            collection: 'pages',
            data: {
                slug: 'home',
                title: { 'en-US': 'Home', 'de-DE': 'Startseite' },
                // SEO localization is LEAF-LEVEL (G4FIX-03): the group itself
                // is never a bucket, its text members are.
                seo: { title: { 'en-US': 'Home' }, description: { 'en-US': 'Welcome' } },
            },
            status: 'published',
            createdAt: NOW,
            updatedAt: NOW,
        });

        // HARNESS-12-style row: localized fields stored as PLAIN values, not buckets — the read
        // path must pass them through as already resolved.
        await ctx.db.insert('cmsDocuments', {
            shopId,
            collection: 'pages',
            data: { slug: 'about', title: 'About', seo: { title: 'About us' } },
            status: 'published',
            createdAt: NOW,
            updatedAt: NOW,
        });

        await ctx.db.insert('cmsDocuments', {
            shopId,
            collection: 'pages',
            data: { slug: 'secret-draft', title: { 'en-US': 'Draft' } },
            status: 'draft',
            createdAt: NOW,
            updatedAt: NOW,
        });

        const articleId = await ctx.db.insert('cmsDocuments', {
            shopId,
            collection: 'articles',
            data: {
                slug: 'launch-news',
                title: { 'en-US': 'Launch News' },
                author: 'Editorial',
                publishedAt: '2026-05-02T00:00:00.000Z',
                tags: ['news'],
            },
            status: 'published',
            createdAt: NOW,
            updatedAt: NOW,
        });
        await ctx.db.insert('cms_i18n', {
            parentId: articleId,
            fieldPath: 'body',
            locale: 'en-US',
            value: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'EN body' }] }] },
            createdAt: NOW,
            updatedAt: NOW,
        });
        await ctx.db.insert('cms_i18n', {
            parentId: articleId,
            fieldPath: 'body',
            locale: 'de-DE',
            value: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'DE body' }] }] },
            createdAt: NOW,
            updatedAt: NOW,
        });

        await ctx.db.insert('cmsDocuments', {
            shopId,
            collection: 'productMetadata',
            data: { shopifyHandle: 'mug', descriptionOverride: { 'en-US': { type: 'doc', content: [] } } },
            status: 'published',
            createdAt: NOW,
            updatedAt: NOW,
        });

        return shopId;
    });
}

/**
 * Builds an authenticated convex-test harness with the corpus seeded and the server secret armed.
 *
 * @returns The harness.
 */
async function corpus(): Promise<ReturnType<typeof convexTest>> {
    process.env.CONVEX_SERVER_SECRET = SERVER_SECRET;
    const t = convexTest(schema, modules);
    await seedCorpus(t);
    return t;
}

const base = { serverSecret: SERVER_SECRET, shopId: SHOP_PUBLIC_ID, locale: 'en-US' };

describe('cms/read — storefront-facing published reads', () => {
    afterEach(() => {
        delete process.env.CONVEX_SERVER_SECRET;
    });

    it('reads a singleton in the SFREAD-01 contract frame', async () => {
        const t = await corpus();
        const header = await t.query(singletonRef, { ...base, collection: 'header' });
        expect(header).toMatchObject({
            logoLink: '/',
            items: [{ link: { kind: 'external', label: 'Shop', url: '/shop/' } }],
            _status: 'published',
            createdAt: new Date(NOW).toISOString(),
            updatedAt: new Date(NOW).toISOString(),
        });
        expect(typeof header?.id).toBe('string');
    });

    it('returns null for an unseeded singleton and for an unresolved shop', async () => {
        const t = await corpus();
        await expect(t.query(singletonRef, { ...base, collection: 'footer' })).resolves.toBeNull();
        await expect(
            t.query(singletonRef, { ...base, shopId: 'no-such-shop', collection: 'header' }),
        ).resolves.toBeNull();
    });

    it('reads a page by slug, collapsing locale buckets for the request locale', async () => {
        const t = await corpus();
        const de = await t.query(pageBySlugRef, { ...base, locale: 'de-DE', slug: 'home' });
        expect(de).toMatchObject({ slug: 'home', title: 'Startseite' });
        // `seo` has no de-DE slot — the chain falls back to the shop default (`en-US`).
        expect(de?.seo).toEqual({ title: 'Home', description: 'Welcome' });
    });

    it('deep-resolves nested localized buckets in the header/footer singletons (CMSGATE-01)', async () => {
        const t = await corpus();
        await t.run(async (ctx) => {
            const shop = (await ctx.db.query('shops').collect()).find((row) => row.legacyId === SHOP_PUBLIC_ID);
            if (!shop) throw new TypeError('corpus shop missing');
            await ctx.db.insert('cmsDocuments', {
                shopId: shop._id,
                collection: 'footer',
                data: {
                    sections: [
                        {
                            title: { 'en-US': 'Shop', 'de-DE': 'Laden' },
                            links: [{ link: { kind: 'external', label: 'All', url: '/all/' } }],
                        },
                    ],
                    copyrightLine: { 'en-US': '© Acme' },
                },
                status: 'published',
                createdAt: NOW,
                updatedAt: NOW,
            });
        });

        const de = await t.query(singletonRef, { ...base, locale: 'de-DE', collection: 'footer' });
        const deSections = de?.sections as Array<Record<string, unknown>>;
        expect(deSections[0]?.title).toBe('Laden');
        // The non-localized link object passes through untouched — its keys
        // (`kind`/`label`/`url`) never trip the bucket shape test.
        expect(deSections[0]?.links).toEqual([{ link: { kind: 'external', label: 'All', url: '/all/' } }]);
        // `copyrightLine` has no de-DE slot — the chain falls back to the shop default.
        expect(de?.copyrightLine).toBe('© Acme');

        // A locale outside every bucket falls back through shop default to the stored slot.
        const sv = await t.query(singletonRef, { ...base, locale: 'sv-SE', collection: 'footer' });
        expect((sv?.sections as Array<Record<string, unknown>>)[0]?.title).toBe('Shop');
    });

    it('serves the editor-bucketed header byte-identically for plain values (golden parity)', async () => {
        const t = await corpus();
        // The corpus header stores PLAIN values only (the HARNESS-12 shape):
        // the deep walk must be a structural no-op for it.
        const header = await t.query(singletonRef, { ...base, collection: 'header' });
        expect(header?.items).toEqual([{ link: { kind: 'external', label: 'Shop', url: '/shop/' } }]);
        expect(header?.logoLink).toBe('/');
    });

    it('tolerates HARNESS-12-style unbucketed rows, passing plain values through as resolved', async () => {
        const t = await corpus();
        const page = await t.query(pageBySlugRef, { ...base, slug: 'about' });
        expect(page).toMatchObject({ slug: 'about', title: 'About', seo: { title: 'About us' } });
    });

    it('returns null for a missing slug and never serves drafts', async () => {
        const t = await corpus();
        await expect(t.query(pageBySlugRef, { ...base, slug: 'absent' })).resolves.toBeNull();
        await expect(t.query(pageBySlugRef, { ...base, slug: 'secret-draft' })).resolves.toBeNull();
        const list = await t.query(pagesRef, base);
        expect(list.docs.map((doc) => doc.slug)).toEqual(['about', 'home']);
    });

    it('reassembles shredded cms_i18n body buckets and resolves them per request locale', async () => {
        const t = await corpus();
        const en = await t.query(articleBySlugRef, { ...base, slug: 'launch-news' });
        expect(en?.body).toEqual({
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'EN body' }] }],
        });
        const de = await t.query(articleBySlugRef, { ...base, locale: 'de-DE', slug: 'launch-news' });
        expect(de?.body).toEqual({
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'DE body' }] }],
        });
    });

    it('filters articles by exact tag and excludes non-matching tags', async () => {
        const t = await corpus();
        const news = await t.query(articlesRef, { ...base, tag: 'news' });
        expect(news.docs.map((doc) => doc.slug)).toEqual(['launch-news']);
        const none = await t.query(articlesRef, { ...base, tag: 'absent-tag' });
        expect(none.docs).toEqual([]);
    });

    it('reads metadata overlays by handle with null-on-missing', async () => {
        const t = await corpus();
        const mug = await t.query(productMetadataRef, { ...base, handle: 'mug' });
        expect(mug).toMatchObject({
            shopifyHandle: 'mug',
            descriptionOverride: { type: 'doc', content: [] },
        });
        await expect(t.query(productMetadataRef, { ...base, handle: 'absent' })).resolves.toBeNull();
    });

    it('recordDivergence appends a queryable ledger row, truncating oversized detail', async () => {
        const t = await corpus();
        await t.mutation(recordDivergenceRef, {
            serverSecret: SERVER_SECRET,
            shop: SHOP_PUBLIC_ID,
            getter: 'page',
            kind: 'mismatch',
            locale: 'en-US',
            key: 'home',
            detail: 'x'.repeat(5_000),
        });
        // `t.run`'s ctx sees the type-erased schema (`Record<string, TableDefinition>`), so the
        // ledger is asserted via a plain collect + JS filter rather than the `by_getter` index.
        const all = await t.run(async (ctx) => ctx.db.query('cmsReadDivergence').collect());
        const rows = all.filter((row) => row.getter === 'page');
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ shop: SHOP_PUBLIC_ID, kind: 'mismatch', key: 'home' });
        expect(rows[0]?.detail?.length).toBe(2_000);
    });

    it('rejects a caller without the server secret', async () => {
        const t = await corpus();
        await expect(
            t.query(singletonRef, { ...base, serverSecret: 'wrong-secret', collection: 'header' }),
        ).rejects.toThrow();
    });
});

describe('cms/read — draft-mode preview reads (CMSDATA-09)', () => {
    afterEach(() => {
        delete process.env.CONVEX_SERVER_SECRET;
    });

    it('serves a draft page only when the explicit draft flag is set', async () => {
        const t = await corpus();
        // Fail-closed default: the same slug stays invisible without the flag…
        await expect(t.query(pageBySlugRef, { ...base, slug: 'secret-draft' })).resolves.toBeNull();
        await expect(t.query(pageBySlugRef, { ...base, slug: 'secret-draft', draft: false })).resolves.toBeNull();
        // …and resolves with it, framed in the same SFREAD-01 contract shape.
        const draft = await t.query(pageBySlugRef, { ...base, slug: 'secret-draft', draft: true });
        expect(draft).toMatchObject({ slug: 'secret-draft', title: 'Draft', _status: 'draft' });
    });

    it('keeps published docs readable under a draft read', async () => {
        const t = await corpus();
        const page = await t.query(pageBySlugRef, { ...base, slug: 'about', draft: true });
        expect(page).toMatchObject({ slug: 'about', title: 'About', _status: 'published' });
    });

    it('prefers the draft row over a published sibling for singletons under draft', async () => {
        const t = await corpus();
        await t.run(async (ctx) => {
            const shops = await ctx.db.query('shops').collect();
            const shop = shops.find((row) => row.legacyId === SHOP_PUBLIC_ID);
            if (!shop) throw new TypeError('seed corpus is missing the canonical shop');
            await ctx.db.insert('cmsDocuments', {
                shopId: shop._id,
                collection: 'header',
                data: { logoLink: '/draft/', items: [] },
                status: 'draft',
                createdAt: NOW + 1,
                updatedAt: NOW + 1,
            });
        });
        // Published render stays pinned to the published row…
        const published = await t.query(singletonRef, { ...base, collection: 'header' });
        expect(published).toMatchObject({ logoLink: '/', _status: 'published' });
        // …while the preview read surfaces the in-flight draft.
        const draft = await t.query(singletonRef, { ...base, collection: 'header', draft: true });
        expect(draft).toMatchObject({ logoLink: '/draft/', _status: 'draft' });
    });

    it('never exposes the draft list through the unflagged list reads', async () => {
        const t = await corpus();
        const list = await t.query(pagesRef, base);
        expect(list.docs.map((doc) => doc.slug)).toEqual(['about', 'home']);
    });
});

describe('cms/read — schema-driven locale-bucket detection (G4FIX-02)', () => {
    afterEach(() => {
        delete process.env.CONVEX_SERVER_SECRET;
    });

    /**
     * Seeds one published `pages` doc whose blocks carry the exact content shapes the old
     * all-short-lowercase-keys heuristic misclassified as locale buckets ({alt,src} and {id,url}),
     * a genuine localized caption bucket, a non-localized locale-shaped content map, and a title
     * bucket whose SLOT content is itself locale-shaped (pathological nesting).
     *
     * @param t - The convex-test harness.
     */
    async function seedShapeTrapPage(t: ReturnType<typeof convexTest>): Promise<void> {
        await t.run(async (ctx) => {
            const shops = await ctx.db.query('shops').collect();
            const shop = shops.find((row) => row.legacyId === SHOP_PUBLIC_ID);
            if (!shop) throw new TypeError('seed corpus is missing the canonical shop');
            await ctx.db.insert('cmsDocuments', {
                shopId: shop._id,
                collection: 'pages',
                data: {
                    slug: 'gallery',
                    title: { 'en-US': { en: 'inner-en', sv: 'inner-sv' } },
                    blocks: [
                        {
                            blockType: 'media-grid',
                            itemType: 'image',
                            columns: 3,
                            items: [
                                {
                                    image: { alt: 'Logo', src: '/logo.png' },
                                    caption: { 'en-US': 'Cap EN', 'de-DE': 'Cap DE' },
                                    link: { id: 'media_1', url: '/m/1/' },
                                },
                            ],
                        },
                        { blockType: 'html', html: '<hr />', translations: { en: 'Yes', sv: 'Ja' } },
                    ],
                },
                status: 'published',
                createdAt: NOW,
                updatedAt: NOW,
            });
        });
    }

    it('preserves {alt,src} and {id,url} content objects the shape heuristic used to eat', async () => {
        const t = await corpus();
        await seedShapeTrapPage(t);
        const page = await t.query(pageBySlugRef, { ...base, slug: 'gallery' });
        const blocks = page?.blocks as Array<Record<string, unknown>>;
        const items = blocks[0]?.items as Array<Record<string, unknown>>;
        expect(items[0]?.image).toEqual({ alt: 'Logo', src: '/logo.png' });
        // `link` sits at a SCHEMA-LOCALIZED path (media-grid's linkField), so the
        // registered-locale key check alone must keep the plain object intact.
        expect(items[0]?.link).toEqual({ id: 'media_1', url: '/m/1/' });
    });

    it('still collapses genuine localized buckets at schema-localized paths', async () => {
        const t = await corpus();
        await seedShapeTrapPage(t);
        const en = await t.query(pageBySlugRef, { ...base, slug: 'gallery' });
        const enItems = (en?.blocks as Array<Record<string, unknown>>)[0]?.items as Array<Record<string, unknown>>;
        expect(enItems[0]?.caption).toBe('Cap EN');
        const de = await t.query(pageBySlugRef, { ...base, locale: 'de-DE', slug: 'gallery' });
        const deItems = (de?.blocks as Array<Record<string, unknown>>)[0]?.items as Array<Record<string, unknown>>;
        expect(deItems[0]?.caption).toBe('Cap DE');
    });

    it('passes a locale-shaped content map at a NON-localized path through untouched', async () => {
        const t = await corpus();
        await seedShapeTrapPage(t);
        const page = await t.query(pageBySlugRef, { ...base, slug: 'gallery' });
        const blocks = page?.blocks as Array<Record<string, unknown>>;
        expect(blocks[1]?.translations).toEqual({ en: 'Yes', sv: 'Ja' });
    });

    it('serves pathological bucket-slot content as-is (a slot whose content is locale-shaped)', async () => {
        const t = await corpus();
        await seedShapeTrapPage(t);
        const page = await t.query(pageBySlugRef, { ...base, slug: 'gallery' });
        expect(page?.title).toEqual({ en: 'inner-en', sv: 'inner-sv' });
    });
});

describe('cms/read — published snapshot pinning (G4FIX-01)', () => {
    afterEach(() => {
        delete process.env.CONVEX_SERVER_SECRET;
    });

    /**
     * Seeds one `pages` doc in the post-G4FIX-01 shape: a published snapshot in `cmsVersions`
     * referenced by `publishedVersionId`, with the live row's `data` already diverged to a newer
     * working draft — the exact state a 2s autosave leaves behind after a publish.
     *
     * @param t - The convex-test harness.
     */
    async function seedDivergedPage(t: ReturnType<typeof convexTest>): Promise<void> {
        await t.run(async (ctx) => {
            const shops = await ctx.db.query('shops').collect();
            const shop = shops.find((row) => row.legacyId === SHOP_PUBLIC_ID);
            if (!shop) throw new TypeError('seed corpus is missing the canonical shop');
            const documentId = await ctx.db.insert('cmsDocuments', {
                shopId: shop._id,
                collection: 'pages',
                data: { title: 'Draft rewrite', slug: 'pinned-draft-slug' },
                status: 'published',
                revision: 2,
                createdAt: NOW,
                updatedAt: NOW + 1,
            });
            const publishedVersionId = await ctx.db.insert('cmsVersions', {
                shopId: shop._id,
                documentId,
                collection: 'pages',
                snapshot: { title: 'Pinned live title', slug: 'pinned' },
                status: 'published',
                revision: 1,
                createdAt: NOW,
            });
            const latestVersionId = await ctx.db.insert('cmsVersions', {
                shopId: shop._id,
                documentId,
                collection: 'pages',
                snapshot: { title: 'Draft rewrite', slug: 'pinned-draft-slug' },
                status: 'draft',
                revision: 2,
                createdAt: NOW + 1,
            });
            await ctx.db.patch(documentId, { publishedVersionId, latestVersionId });
        });
    }

    it('live reads keep serving the published snapshot while a newer draft exists', async () => {
        const t = await corpus();
        await seedDivergedPage(t);

        // The published slug serves the published snapshot — not the diverged working draft.
        const live = await t.query(pageBySlugRef, { ...base, slug: 'pinned' });
        expect(live).toMatchObject({ title: 'Pinned live title', slug: 'pinned', _status: 'published' });
        // The draft's renamed slug is invisible to live traffic…
        await expect(t.query(pageBySlugRef, { ...base, slug: 'pinned-draft-slug' })).resolves.toBeNull();
        // …but the preview seam serves the working draft under it, flagged as a draft.
        const preview = await t.query(pageBySlugRef, { ...base, slug: 'pinned-draft-slug', draft: true });
        expect(preview).toMatchObject({ title: 'Draft rewrite', slug: 'pinned-draft-slug', _status: 'draft' });

        // The list read serves the published view of the diverged doc too.
        const list = await t.query(pagesRef, base);
        expect(list.docs.map((doc) => doc.slug)).toEqual(['about', 'home', 'pinned']);
    });

    it('publishing again moves live serving to the new snapshot', async () => {
        const t = await corpus();
        await seedDivergedPage(t);

        await t.run(async (ctx) => {
            const docs = await ctx.db.query('cmsDocuments').collect();
            const doc = docs.find((row) => (row.data as { slug?: string }).slug === 'pinned-draft-slug');
            if (!doc) throw new TypeError('diverged page missing');
            const versionId = await ctx.db.insert('cmsVersions', {
                shopId: doc.shopId,
                documentId: doc._id,
                collection: 'pages',
                snapshot: { title: 'Republished title', slug: 'pinned' },
                status: 'published',
                revision: 3,
                createdAt: NOW + 2,
            });
            await ctx.db.patch(doc._id, {
                data: { title: 'Republished title', slug: 'pinned' },
                latestVersionId: versionId,
                publishedVersionId: versionId,
                revision: 3,
                updatedAt: NOW + 2,
            });
        });

        const live = await t.query(pageBySlugRef, { ...base, slug: 'pinned' });
        expect(live).toMatchObject({ title: 'Republished title', slug: 'pinned', _status: 'published' });
    });
});
