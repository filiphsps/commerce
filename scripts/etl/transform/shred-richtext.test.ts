import { describe, expect, it } from 'vitest';

import { lexicalToProseMirror } from '../../../packages/cms/src/editor/richtext/lexical-to-prosemirror';
import { MAX_SHREDDED_VALUE_BYTES, reassembleShreddedFields } from '../../../packages/convex/convex/cms/i18n_shred';
import { heading, lexicalDoc, list, paragraph } from '../fixtures/lexical';
import { type Doc, deriveId, remapObjectId } from './id-remap';
import { transformCmsDocuments } from './shred-richtext';

/** Stable source ids so every surrogate derivation is checkable. */
const ARTICLE_ID = '6630f1a2b3c4d5e6f7a8b9c0';
const ARTICLE_B_ID = '6630f1a2b3c4d5e6f7a8b9c1';
const SHOP_ID = '6630f1a2b3c4d5e6f7a8b9d1';

/** One MiB — the Convex per-document/value ceiling the shred exists to stay under. */
const ONE_MIB = 1024 * 1024;

/**
 * Builds a source `articles` document in mongoexport extended JSON with `body` deliberately LAST so
 * the reassembled field map (inline + rehydrated buckets appended) is byte-comparable to the source.
 *
 * @param body - The localized `body` value (a locale bucket of Lexical documents).
 * @param overrides - Extra/replacement source fields.
 * @returns The raw article document.
 */
const article = (body: unknown, overrides: Doc = {}): Doc => ({
    _id: { $oid: ARTICLE_ID },
    tenant: { $oid: SHOP_ID },
    title: { 'en-US': 'Title EN', 'sv-SE': 'Titel SV' },
    slug: 'hello-world',
    author: 'Nordcom',
    body,
    _status: 'published',
    createdAt: { $date: '2024-04-30T00:00:00.000Z' },
    updatedAt: { $date: '2024-05-01T00:00:00.000Z' },
    __v: 0,
    ...overrides,
});

/** The UTF-8 byte size of a value's JSON encoding. */
const jsonBytes = (value: unknown): number => Buffer.byteLength(JSON.stringify(value));

describe('acceptance #1 — >1MiB multi-locale doc shreds into <1MiB side rows that reassemble byte-identically', () => {
    // Three ~600 KB locale bodies: the combined source document is far over the 1 MiB document
    // ceiling, while each individual locale stays well under the per-row cap.
    const bigText = (locale: string): string => `[${locale}] ${'lorem ipsum dolor sit amet '.repeat(22_000)}`;
    const bodyBucket = {
        'en-US': lexicalDoc([heading('Big EN', 'h1'), paragraph(bigText('en-US'))]),
        'sv-SE': lexicalDoc([heading('Stor SV', 'h1'), paragraph(bigText('sv-SE'))]),
        'de-DE': lexicalDoc([heading('Gross DE', 'h1'), paragraph(bigText('de-DE'))]),
    };
    const raw = article(bodyBucket);
    const result = transformCmsDocuments('articles', [raw]);

    it('the synthetic source document exceeds 1 MiB', () => {
        expect(jsonBytes(raw)).toBeGreaterThan(ONE_MIB);
    });

    it('stages one document and one side row per (fieldPath, locale), zero divergences', () => {
        expect(result.divergences).toEqual([]);
        expect(result.cmsDocuments).toHaveLength(1);
        expect(result.cms_i18n).toHaveLength(3);
    });

    it('every side row is under 1 MiB and under the runtime per-row cap', () => {
        for (const row of result.cms_i18n) {
            expect(jsonBytes(row.document)).toBeLessThan(ONE_MIB);
            expect(jsonBytes(row.document.value)).toBeLessThan(MAX_SHREDDED_VALUE_BYTES);
        }
    });

    it('side rows carry the exact runtime cms_i18n layout keyed (parentId, fieldPath, locale)', () => {
        const parentId = remapObjectId('cmsDocuments', ARTICLE_ID);
        for (const row of result.cms_i18n) {
            expect(Object.keys(row.document)).toEqual([
                'parentId',
                'fieldPath',
                'locale',
                'value',
                'createdAt',
                'updatedAt',
            ]);
            expect(row.document.parentId).toBe(parentId);
            expect(row.document.fieldPath).toBe('body');
            expect(row.payloadId).toBe(deriveId('cms_i18n', parentId, 'body', String(row.document.locale)));
        }
    });

    it('small localized scalars stay inline on the parent; only the registered rich body is shredded', () => {
        const data = result.cmsDocuments[0]?.document.data as Record<string, unknown>;
        expect(data.title).toEqual({ 'en-US': 'Title EN', 'sv-SE': 'Titel SV' });
        expect(data.slug).toBe('hello-world');
        expect('body' in data).toBe(false);
    });

    it('reassembly through the REAL runtime reassembler is byte-identical to the converted source', () => {
        const expected = {
            title: { 'en-US': 'Title EN', 'sv-SE': 'Titel SV' },
            slug: 'hello-world',
            author: 'Nordcom',
            body: {
                'en-US': lexicalToProseMirror(bodyBucket['en-US']),
                'sv-SE': lexicalToProseMirror(bodyBucket['sv-SE']),
                'de-DE': lexicalToProseMirror(bodyBucket['de-DE']),
            },
        };
        const inline = result.cmsDocuments[0]?.document.data;
        const reassembled = reassembleShreddedFields(
            inline,
            result.cms_i18n.map((row) => ({
                fieldPath: String(row.document.fieldPath),
                locale: String(row.document.locale),
                value: row.document.value,
            })),
        );
        expect(JSON.stringify(reassembled)).toBe(JSON.stringify(expected));
    });
});

describe('acceptance #2 — rich text round-trips through the real CMSRICH-04 codec', () => {
    const fixtureDoc = lexicalDoc([heading('Hello', 'h1'), paragraph('World'), list(['alpha', 'beta'], 'number')]);
    const result = transformCmsDocuments('articles', [article({ 'en-US': fixtureDoc })]);

    it('converts the repo Lexical fixture via lexicalToProseMirror, byte-for-byte', () => {
        const row = result.cms_i18n[0];
        expect(row).toBeDefined();
        expect(JSON.stringify(row?.document.value)).toBe(JSON.stringify(lexicalToProseMirror(fixtureDoc)));
    });

    it('quarantines a document with an unconvertible node into the divergence report, never dropping silently', () => {
        const poisoned = article({ 'en-US': lexicalDoc([{ type: 'video', src: 'https://cdn/x.mp4', version: 1 }]) });
        const healthy = article(
            { 'en-US': lexicalDoc([paragraph('fine')]) },
            { _id: { $oid: ARTICLE_B_ID }, slug: 'healthy' },
        );
        const mixed = transformCmsDocuments('articles', [poisoned, healthy]);

        expect(mixed.divergences).toHaveLength(1);
        expect(mixed.divergences[0]).toMatchObject({
            collection: 'articles',
            legacyId: ARTICLE_ID,
            fieldPath: 'body',
            locale: 'en-US',
        });
        expect(mixed.divergences[0]?.reason).toContain('video');
        // The poisoned document is fully quarantined; the healthy one still stages.
        expect(mixed.cmsDocuments.map((row) => row.payloadId)).toEqual([remapObjectId('cmsDocuments', ARTICLE_B_ID)]);
        expect(mixed.cms_i18n).toHaveLength(1);
    });

    it('quarantines a registered rich field that is not a locale bucket instead of mangling its keys', () => {
        const bare = transformCmsDocuments('articles', [article(lexicalDoc([paragraph('not bucketed')]))]);
        expect(bare.cmsDocuments).toEqual([]);
        expect(bare.divergences[0]).toMatchObject({ fieldPath: 'body' });
    });

    it('converts block-embedded rich-text bodies in unregistered collections, leaving them inline', () => {
        const page: Doc = {
            _id: { $oid: ARTICLE_B_ID },
            tenant: { $oid: SHOP_ID },
            title: { 'en-US': 'Page' },
            blocks: [
                {
                    blockType: 'rich-text',
                    body: { 'en-US': lexicalDoc([paragraph('Block body')]) },
                    collapsible: false,
                },
            ],
        };
        const staged = transformCmsDocuments('pages', [page]);
        expect(staged.divergences).toEqual([]);
        expect(staged.cms_i18n).toEqual([]);
        const data = staged.cmsDocuments[0]?.document.data as {
            blocks: { body: Record<string, { type: string }> }[];
        };
        expect(data.blocks[0]?.body['en-US']?.type).toBe('doc');
    });
});

describe('quarantine of a single locale too large for one side row', () => {
    it('routes the runtime VALUE_EXCEEDS_SHRED_LIMIT failure into the divergence report', () => {
        const oversize = article({ 'en-US': lexicalDoc([paragraph('x'.repeat(MAX_SHREDDED_VALUE_BYTES + 1024))]) });
        const result = transformCmsDocuments('articles', [oversize]);
        expect(result.cmsDocuments).toEqual([]);
        expect(result.cms_i18n).toEqual([]);
        expect(result.divergences[0]).toMatchObject({
            collection: 'articles',
            legacyId: ARTICLE_ID,
            fieldPath: 'body',
            locale: 'en-US',
        });
        expect(result.divergences[0]?.reason).toContain('per-row limit');
    });
});

describe('determinism and purity', () => {
    const input = [article({ 'en-US': lexicalDoc([paragraph('stable')]) })];

    it('produces a byte-identical dataset on a re-run (same input -> same output, no dupes)', () => {
        expect(JSON.stringify(transformCmsDocuments('articles', input))).toBe(
            JSON.stringify(transformCmsDocuments('articles', input)),
        );
    });

    it('never mutates the input', () => {
        const snapshot = structuredClone(input);
        transformCmsDocuments('articles', input);
        expect(input).toEqual(snapshot);
    });

    it('maps tenancy and status onto the staged row', () => {
        const row = transformCmsDocuments('articles', input).cmsDocuments[0];
        expect(row?.document.shopId).toBe(remapObjectId('shops', SHOP_ID));
        expect(row?.document.status).toBe('published');
        expect(row?.document.collection).toBe('articles');
        expect(row?.document.createdAt).toBe(Date.parse('2024-04-30T00:00:00.000Z'));
    });

    it('skips a document with no resolvable id or tenant rather than throwing', () => {
        expect(transformCmsDocuments('articles', [{ title: 'no id' }]).cmsDocuments).toEqual([]);
        expect(transformCmsDocuments('articles', [{ _id: { $oid: ARTICLE_ID } }]).cmsDocuments).toEqual([]);
    });
});
