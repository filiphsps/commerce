import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';
import schema from '../schema';
import {
    buildLocaleFallbackChain,
    CMS_LOCALIZED_FIELDS_BY_COLLECTION,
    isLocaleBucket,
    isLocalizedValueEmpty,
    type LocalizedBucket,
    localizedPathsFor,
    PLATFORM_DEFAULT_LOCALE,
    readLocalizedField,
    reassembleLocalizedDocument,
    writeLocalizedDocumentField,
    writeLocalizedField,
} from './localization';
import { CMS_LOCALIZED_PATHS_BY_COLLECTION } from './localized_paths';

/** Fixed epoch-ms stamp for seeded rows' managed timestamps; its value is irrelevant to the assertions. */
const NOW = 1_700_000_000_000;

/**
 * Seeds one shop carrying the given `i18n.defaultLocale`. Returns the row id so a test can scope a
 * `cmsDocuments` row to it and resolve the shop-tier fallback locale from the unified `shops` row.
 *
 * @param t - The active `convex-test` harness.
 * @param defaultLocale - The shop default locale to store, or `undefined` to omit `i18n` entirely.
 * @returns The seeded shop's Convex id.
 */
const seedShop = (t: ReturnType<typeof convexTest>, defaultLocale: string | undefined) =>
    t.run((ctx) =>
        ctx.db.insert('shops', {
            legacyId: 'shop_loc',
            name: 'Localized Shop',
            domain: 'loc.example.com',
            ...(defaultLocale ? { i18n: { defaultLocale } } : {}),
            design: {
                header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: 'logo' } },
                accents: [],
            },
            commerceProvider: { type: 'stripe', authentication: {} },
            createdAt: NOW,
            updatedAt: NOW,
        }),
    );

describe('buildLocaleFallbackChain', () => {
    it('orders request → shop → platform and de-duplicates', () => {
        expect(buildLocaleFallbackChain('de-DE', 'sv-SE', 'en-US')).toEqual(['de-DE', 'sv-SE', 'en-US']);
        expect(buildLocaleFallbackChain('sv-SE', 'sv-SE')).toEqual(['sv-SE', PLATFORM_DEFAULT_LOCALE]);
        expect(buildLocaleFallbackChain(undefined, undefined)).toEqual([PLATFORM_DEFAULT_LOCALE]);
        expect(buildLocaleFallbackChain('  ', '')).toEqual([PLATFORM_DEFAULT_LOCALE]);
    });
});

describe('isLocalizedValueEmpty', () => {
    it('treats absent, null, and blank strings as empty; other values as present', () => {
        expect(isLocalizedValueEmpty(undefined)).toBe(true);
        expect(isLocalizedValueEmpty(null)).toBe(true);
        expect(isLocalizedValueEmpty('   ')).toBe(true);
        expect(isLocalizedValueEmpty('Hello')).toBe(false);
        expect(isLocalizedValueEmpty(0)).toBe(false);
        expect(isLocalizedValueEmpty(false)).toBe(false);
        expect(isLocalizedValueEmpty({ title: 'x' })).toBe(false);
    });
});

describe('readLocalizedField fallback', () => {
    it('returns the requested locale when present', () => {
        const bucket: LocalizedBucket<string> = { 'de-DE': 'Hallo', 'en-US': 'Hello' };
        expect(readLocalizedField(bucket, ['de-DE', 'en-US'])).toBe('Hallo');
    });

    it('falls through an empty requested bucket to the shop default, then the platform default', () => {
        const shopOnly: LocalizedBucket<string> = { 'sv-SE': 'Hej' };
        expect(readLocalizedField(shopOnly, ['de-DE', 'sv-SE', 'en-US'])).toBe('Hej');

        const platformOnly: LocalizedBucket<string> = { 'en-US': 'Hello' };
        expect(readLocalizedField(platformOnly, ['de-DE', 'sv-SE', 'en-US'])).toBe('Hello');

        const blankRequested: LocalizedBucket<string> = { 'de-DE': '   ', 'en-US': 'Hello' };
        expect(readLocalizedField(blankRequested, ['de-DE', 'en-US'])).toBe('Hello');
    });

    it('returns undefined for an absent bucket or an all-empty chain', () => {
        expect(readLocalizedField(undefined, ['en-US'])).toBeUndefined();
        expect(readLocalizedField({ 'fr-FR': 'Bonjour' }, ['de-DE', 'en-US'])).toBeUndefined();
    });
});

describe('writeLocalizedField isolation', () => {
    it('writes only the active locale and never mutates the input', () => {
        const original: LocalizedBucket<string> = { 'en-US': 'Hello' };
        const next = writeLocalizedField(original, 'de-DE', 'Hallo');
        expect(next).toEqual({ 'en-US': 'Hello', 'de-DE': 'Hallo' });
        // Locale A is byte-for-byte intact and the input object is untouched.
        expect(next['en-US']).toBe('Hello');
        expect(original).toEqual({ 'en-US': 'Hello' });
    });

    it('starts a fresh bucket from an absent field', () => {
        expect(writeLocalizedField(undefined, 'sv-SE', 'Hej')).toEqual({ 'sv-SE': 'Hej' });
    });
});

describe('CMS_LOCALIZED_FIELDS_BY_COLLECTION', () => {
    it('names the TOP-LEVEL members of the frozen localized set', () => {
        // `seo` left this registry with G4FIX-03: SEO localization is
        // leaf-level (`seo.title`/`seo.description`/`seo.keywords`), which the
        // deep, path-gated walk in `read.ts` resolves instead.
        expect(CMS_LOCALIZED_FIELDS_BY_COLLECTION).toEqual({
            pages: ['title'],
            articles: ['title', 'excerpt', 'body'],
            productMetadata: ['descriptionOverride'],
            collectionMetadata: ['descriptionOverride'],
            media: ['caption'],
        });
    });

    it('stays in lockstep with the generated descriptor-derived path registry (G4FIX-02)', () => {
        // The hand registry must equal the TOP-LEVEL slice of the cms:gen output
        // for every collection it names — schema-driven convergence: one
        // descriptor source feeds both the top-level resolver and the deep walk.
        for (const [collection, fields] of Object.entries(CMS_LOCALIZED_FIELDS_BY_COLLECTION)) {
            const topLevel = (CMS_LOCALIZED_PATHS_BY_COLLECTION[collection] ?? []).filter(
                (path) => !path.includes('.'),
            );
            expect([...fields].sort()).toEqual(topLevel);
        }
    });
});

describe('isLocaleBucket — the registered-locale discriminator (G4FIX-02)', () => {
    it('accepts authored buckets, including region pairs outside the curated list', () => {
        expect(isLocaleBucket({ 'en-US': 'Hello', 'de-DE': 'Hallo' })).toBe(true);
        expect(isLocaleBucket({ 'en-US': 'Hello' })).toBe(true);
        expect(isLocaleBucket({ en: 'Hello', de: 'Hallo' })).toBe(true);
        expect(isLocaleBucket({ 'en-FI': 'Hello', 'sv-AX': 'Hej' })).toBe(true);
    });

    it('rejects the {alt,src}/{id,url} false-positive class and other content shapes', () => {
        // Mirror of the editor form's `isLocaleBucketValue` cases — the two
        // discriminators must agree on what counts as a bucket.
        expect(isLocaleBucket({ alt: 'Logo', src: '/logo.png' })).toBe(false);
        expect(isLocaleBucket({ id: 'media_1', url: '/m/logo.png' })).toBe(false);
        expect(isLocaleBucket({ kind: 'external', url: '/x/' })).toBe(false);
        expect(isLocaleBucket({ id: 'doc_1' })).toBe(false);
        expect(isLocaleBucket({ en: 'only-one-bare-slot' })).toBe(false);
        expect(isLocaleBucket({})).toBe(false);
        expect(isLocaleBucket(['en-US'])).toBe(false);
        expect(isLocaleBucket('en-US')).toBe(false);
        expect(isLocaleBucket(null)).toBe(false);
    });
});

describe('localizedPathsFor', () => {
    it('serves the generated wildcard patterns per collection and the empty set for unknown slugs', () => {
        expect(localizedPathsFor('header').has('items.*.description')).toBe(true);
        expect(localizedPathsFor('header').has('localeSwitcher.label')).toBe(true);
        expect(localizedPathsFor('pages').has('blocks.*.body')).toBe(true);
        expect(localizedPathsFor('pages').has('blocks.*.items.*.caption')).toBe(true);
        expect(localizedPathsFor('businessData').size).toBe(0);
        expect(localizedPathsFor('no-such-collection').size).toBe(0);
    });
});

describe('document-level reassemble and write', () => {
    it('reassembles localized fields to the active locale and passes non-localized fields through', () => {
        const data = {
            shop: 'shop_loc',
            slug: 'about',
            title: { 'sv-SE': 'Om oss' },
            // `seo` is no longer a top-level localized field (G4FIX-03): its
            // leaf buckets belong to the deep walk, so the group passes
            // through this resolver untouched.
            seo: { title: { 'en-US': 'About' } },
        };
        const chain = buildLocaleFallbackChain('de-DE', 'sv-SE');
        expect(reassembleLocalizedDocument('pages', data, chain)).toEqual({
            shop: 'shop_loc',
            slug: 'about',
            title: 'Om oss',
            seo: { title: { 'en-US': 'About' } },
        });
    });

    it('omits a localized field that resolves empty across the whole chain', () => {
        const data = { title: { 'fr-FR': 'Bonjour' } };
        const chain = buildLocaleFallbackChain('de-DE', 'sv-SE');
        expect(reassembleLocalizedDocument('pages', data, chain)).toEqual({});
    });

    it('writes locale B into a document field while leaving locale A untouched', () => {
        const data = { slug: 'about', title: { 'en-US': 'About' } };
        const next = writeLocalizedDocumentField(data, 'title', 'de-DE', 'Über uns');
        expect(next).toEqual({ slug: 'about', title: { 'en-US': 'About', 'de-DE': 'Über uns' } });
        expect(data).toEqual({ slug: 'about', title: { 'en-US': 'About' } });
    });
});

describe('convex-test: localized read over a seeded shop + cmsDocuments row', () => {
    it('falls back request → shop → platform when the requested bucket is empty', async () => {
        const t = convexTest(schema, import.meta.glob('../**/*.ts'));
        const shopId = await seedShop(t, 'sv-SE');
        const documentId = await t.run((ctx) =>
            ctx.db.insert('cmsDocuments', {
                shopId,
                collection: 'pages',
                // The requested locale (de-DE) is absent; the shop default (sv-SE) carries the value.
                data: { slug: 'about', title: { 'sv-SE': 'Om oss', 'en-US': 'About' } },
                status: 'published',
                createdAt: NOW,
                updatedAt: NOW,
            }),
        );

        const resolved = await t.run(async (ctx) => {
            const shop = await ctx.db.get(shopId);
            const document = await ctx.db.get(documentId);
            const chain = buildLocaleFallbackChain('de-DE', shop?.i18n?.defaultLocale);
            return reassembleLocalizedDocument('pages', document?.data, chain);
        });

        // Requested de-DE empty → shop sv-SE wins (the request→shop hop).
        expect(resolved.title).toBe('Om oss');
    });

    it('falls through to the platform default when both request and shop buckets are empty', async () => {
        const t = convexTest(schema, import.meta.glob('../**/*.ts'));
        const shopId = await seedShop(t, 'sv-SE');
        const documentId = await t.run((ctx) =>
            ctx.db.insert('cmsDocuments', {
                shopId,
                collection: 'pages',
                data: { title: { 'en-US': 'About' } },
                status: 'published',
                createdAt: NOW,
                updatedAt: NOW,
            }),
        );

        const resolved = await t.run(async (ctx) => {
            const shop = await ctx.db.get(shopId);
            const document = await ctx.db.get(documentId);
            const chain = buildLocaleFallbackChain('de-DE', shop?.i18n?.defaultLocale);
            return reassembleLocalizedDocument('pages', document?.data, chain);
        });

        // de-DE and sv-SE empty → falls through to the platform default en-US.
        expect(resolved.title).toBe('About');
    });

    it('writes locale B to a persisted document leaving locale A untouched', async () => {
        const t = convexTest(schema, import.meta.glob('../**/*.ts'));
        const shopId = await seedShop(t, 'en-US');
        const documentId = await t.run((ctx) =>
            ctx.db.insert('cmsDocuments', {
                shopId,
                collection: 'pages',
                data: { slug: 'about', title: { 'en-US': 'About' } },
                status: 'draft',
                createdAt: NOW,
                updatedAt: NOW,
            }),
        );

        await t.run(async (ctx) => {
            const document = await ctx.db.get(documentId);
            const data = writeLocalizedDocumentField(document?.data, 'title', 'de-DE', 'Über uns');
            await ctx.db.patch(documentId, { data, updatedAt: NOW });
        });

        const stored = await t.run((ctx) => ctx.db.get(documentId));
        expect(stored?.data.title).toEqual({ 'en-US': 'About', 'de-DE': 'Über uns' });
    });
});
