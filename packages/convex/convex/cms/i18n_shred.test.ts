import { ConvexError, getConvexSize, getDocumentSize } from 'convex/values';
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import schema from '../schema';
import {
    assertCmsCollectionShredArgWithinCallLimit,
    assertShredArgWithinCallLimit,
    assertShreddedValuesWithinLimit,
    CMS_SHREDDED_FIELDS_BY_COLLECTION,
    CmsI18nShredErrorCode,
    gatherShreddedSideRows,
    MAX_SHREDDED_VALUE_BYTES,
    parentQueryableField,
    readShreddedDocument,
    reassembleShreddedFields,
    type ShreddableCollection,
    shredLocalizedFields,
    writeShreddedDocument,
} from './i18n_shred';

/** Convex's hard 1 MiB per-document/per-value ceiling; every shredded side row must encode under it. */
const ONE_MIB = 1024 * 1024;

/** Fixed epoch-ms stamp for seeded rows' managed timestamps; its value is irrelevant to the assertions. */
const NOW = 1_700_000_000_000;

/**
 * Seeds one shop so a `cmsDocuments` parent can be scoped to a real tenant root.
 *
 * @param t - The active `convex-test` harness.
 * @returns The seeded shop's Convex id.
 */
const seedShop = (t: ReturnType<typeof convexTest>) =>
    t.run((ctx) =>
        ctx.db.insert('shops', {
            legacyId: 'shop_shred',
            name: 'Shred Shop',
            domain: 'shred.example.com',
            design: {
                header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: 'logo' } },
                accents: [],
            },
            commerceProvider: { type: 'stripe', authentication: {} },
            createdAt: NOW,
            updatedAt: NOW,
        }),
    );

describe('shredLocalizedFields / reassembleShreddedFields (pure)', () => {
    it('lifts a localized rich field into per-locale side rows and reassembles byte-identical', () => {
        const data = {
            slug: 'guide',
            title: { 'en-US': 'Guide' },
            body: { 'en-US': 'A'.repeat(1000), 'de-DE': 'B'.repeat(500) },
        };
        const { inline, sideRows } = shredLocalizedFields('articles', data);

        // The small localized scalar stays inline; only the rich `body` bucket is shredded.
        expect(inline).toEqual({ slug: 'guide', title: { 'en-US': 'Guide' } });
        expect(sideRows).toEqual([
            { fieldPath: 'body', locale: 'en-US', value: 'A'.repeat(1000) },
            { fieldPath: 'body', locale: 'de-DE', value: 'B'.repeat(500) },
        ]);

        const reassembled = reassembleShreddedFields(inline, sideRows);
        expect(reassembled).toEqual(data);
        // Same key + locale order out the far side: a literal byte-for-byte round-trip.
        expect(JSON.stringify(reassembled)).toBe(JSON.stringify(data));
    });

    it('leaves a collection with no shredded fields untouched', () => {
        const data = { title: { 'en-US': 'Hi' }, slug: 'x' };
        const { inline, sideRows } = shredLocalizedFields('pages', data);
        expect(sideRows).toEqual([]);
        expect(inline).toEqual(data);
    });

    it('keeps an empty bucket inline rather than dropping the field', () => {
        const data = { slug: 'x', body: {} };
        const { inline, sideRows } = shredLocalizedFields('articles', data);
        expect(sideRows).toEqual([]);
        expect(inline).toEqual({ slug: 'x', body: {} });
    });
});

describe('convex-test: 1 MiB max-locale richtext doc round-trips through cms_i18n', () => {
    it('shreds into side rows each under 1 MiB and reassembles byte-identical', async () => {
        const t = convexTest(schema, import.meta.glob('../**/*.ts'));
        const shopId = await seedShop(t);
        const parentId = await t.run((ctx) =>
            ctx.db.insert('cmsDocuments', {
                shopId,
                collection: 'articles',
                data: {},
                status: 'draft',
                createdAt: NOW,
                updatedAt: NOW,
            }),
        );

        // The largest locale approaches the 1 MiB value ceiling; a second locale pushes the combined
        // pre-shred field well past what a single 1 MiB document could ever hold inline.
        const maxLocale = 'x'.repeat(1_000_000);
        const secondLocale = 'y'.repeat(300_000);
        expect(getConvexSize(maxLocale)).toBeGreaterThan(900 * 1024);
        expect(getConvexSize(maxLocale)).toBeLessThan(ONE_MIB);
        expect(getConvexSize(maxLocale) + getConvexSize(secondLocale)).toBeGreaterThan(ONE_MIB);

        const data = {
            slug: 'guide',
            title: { 'en-US': 'Guide' },
            body: { 'en-US': maxLocale, 'de-DE': secondLocale },
        };

        const { inline } = await t.run((ctx) => writeShreddedDocument(ctx.db, parentId, 'articles', data, NOW));
        await t.run((ctx) => ctx.db.patch(parentId, { data: inline, updatedAt: NOW }));

        // Every shredded side row is a standalone document that fits under the 1 MiB ceiling.
        const rowSizes = await t.run(async (ctx) => {
            const rows = await gatherShreddedSideRows(ctx.db, parentId);
            return rows.map((row) => getDocumentSize(row));
        });
        expect(rowSizes).toHaveLength(2);
        for (const size of rowSizes) expect(size).toBeLessThan(ONE_MIB);

        // The parent now stores only the small inline data — no inline body.
        const parentData = await t.run(async (ctx) => (await ctx.db.get(parentId))?.data);
        expect(parentData).toEqual({ slug: 'guide', title: { 'en-US': 'Guide' } });

        const reassembled = await t.run(async (ctx) => {
            const parent = await ctx.db.get(parentId);
            return readShreddedDocument(ctx.db, parentId, parent?.data);
        });
        expect(reassembled).toEqual(data);
        // Byte-identity of each large locale value is the substantive round-trip guarantee — JSON object
        // key order is not a semantic contract, so it is the deep + per-value equality that is asserted.
        expect((reassembled.body as Record<string, unknown>)['en-US']).toBe(maxLocale);
        expect((reassembled.body as Record<string, unknown>)['de-DE']).toBe(secondLocale);
    });
});

describe('assertShreddedValuesWithinLimit', () => {
    it('throws a typed error when a single locale value exceeds the per-row cap', () => {
        const sideRows = [{ fieldPath: 'body', locale: 'en-US', value: 'z'.repeat(MAX_SHREDDED_VALUE_BYTES + 1000) }];
        let caught: unknown;
        try {
            assertShreddedValuesWithinLimit('articles', sideRows);
        } catch (error) {
            caught = error;
        }
        expect(caught).toBeInstanceOf(ConvexError);
        expect((caught as ConvexError<{ code: string }>).data.code).toBe(
            CmsI18nShredErrorCode.VALUE_EXCEEDS_SHRED_LIMIT,
        );
    });

    it('passes when every locale value fits under the cap', () => {
        const sideRows = [{ fieldPath: 'body', locale: 'en-US', value: 'ok' }];
        expect(() => assertShreddedValuesWithinLimit('articles', sideRows)).not.toThrow();
    });
});

describe('assertShredArgWithinCallLimit (schema-gen guard)', () => {
    it('rejects a collection whose worst-case pre-shred argument exceeds the per-call limit', () => {
        // 20 shreddable fields × the locale budget × ~1 MiB each is far past Convex's 16 MiB call limit.
        let caught: unknown;
        try {
            assertShredArgWithinCallLimit({ collection: 'mega', shreddableFieldCount: 20 });
        } catch (error) {
            caught = error;
        }
        expect(caught).toBeInstanceOf(ConvexError);
        expect((caught as ConvexError<{ code: string }>).data.code).toBe(
            CmsI18nShredErrorCode.COLLECTION_EXCEEDS_CALL_LIMIT,
        );
    });

    it('admits every real shreddable collection at schema-gen', () => {
        for (const collection of Object.keys(CMS_SHREDDED_FIELDS_BY_COLLECTION) as ShreddableCollection[]) {
            expect(() => assertCmsCollectionShredArgWithinCallLimit(collection)).not.toThrow();
        }
    });
});

describe('parentQueryableField (no where/sort on a shredded field)', () => {
    it('returns an inline field unchanged', () => {
        expect(parentQueryableField('articles', 'title')).toBe('title');
    });

    it('rejects a shredded field as a query key at compile time and runtime', () => {
        // @ts-expect-error 'body' is shredded into cms_i18n; it has no inline parent column to filter or sort on.
        expect(() => parentQueryableField('articles', 'body')).toThrow(ConvexError);
    });
});
