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
const SHOP_PUBLIC_ID = 'shop_mongo_legacy';
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
                seo: { 'en-US': { title: 'Home', description: 'Welcome' } },
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
