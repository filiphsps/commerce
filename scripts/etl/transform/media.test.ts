import { describe, expect, it } from 'vitest';

import { type Doc, remapObjectId } from './id-remap';
import { CMS_MEDIA_STORAGE_ACTION, transformCmsMedia } from './media';

/** Stable source ids so every surrogate derivation is checkable. */
const MEDIA_ID = '6630f1a2b3c4d5e6f7a8cc01';
const MEDIA_B_ID = '6630f1a2b3c4d5e6f7a8cc02';
const SHOP_ID = '6630f1a2b3c4d5e6f7a8b9d1';

/**
 * Builds a raw Payload `media` document in mongoexport extended JSON, mirroring the fields the
 * S3 storage plugin and the frozen media collection persist.
 *
 * @param overrides - Extra/replacement source fields.
 * @returns The raw media document.
 */
const mediaDoc = (overrides: Doc = {}): Doc => ({
    _id: { $oid: MEDIA_ID },
    tenant: { $oid: SHOP_ID },
    filename: 'logo.png',
    mimeType: 'image/png',
    filesize: 12_345,
    alt: 'Logo',
    caption: { 'en-US': 'Caption EN', 'sv-SE': 'Bildtext SV' },
    prefix: 'media/shop-1',
    width: 512,
    height: 512,
    focalX: 0.5,
    focalY: 0.25,
    url: 'https://cdn.example.com/media/shop-1/logo.png',
    createdAt: { $date: '2024-04-30T00:00:00.000Z' },
    updatedAt: { $date: '2024-05-01T00:00:00.000Z' },
    __v: 0,
    ...overrides,
});

describe('acceptance #4 — media rows preserve their S3/R2 keys and emit a post-import storage plan', () => {
    const result = transformCmsMedia([mediaDoc()]);

    it('derives the preserved object key exactly as the Payload storage plugin did (prefix/filename)', () => {
        expect(result.storagePlan).toEqual([
            {
                mediaPayloadId: remapObjectId('cmsMedia', MEDIA_ID),
                sourceKey: 'media/shop-1/logo.png',
                targetKey: 'media/shop-1/logo.png',
                storageAction: CMS_MEDIA_STORAGE_ACTION,
            },
        ]);
    });

    it('keys the object by bare filename when the document has no prefix', () => {
        const bare = transformCmsMedia([mediaDoc({ prefix: undefined })]);
        expect(bare.storagePlan[0]?.sourceKey).toBe('logo.png');
        expect(bare.storagePlan[0]?.targetKey).toBe('logo.png');
    });

    it('stages a schema-shaped cmsMedia row WITHOUT storageId — the import patches it post-action', () => {
        const row = result.cmsMedia[0];
        expect(row?.payloadId).toBe(remapObjectId('cmsMedia', MEDIA_ID));
        expect(row?.document).toEqual({
            shopId: remapObjectId('shops', SHOP_ID),
            filename: 'logo.png',
            mimeType: 'image/png',
            filesize: 12_345,
            alt: 'Logo',
            caption: 'Caption EN',
            width: 512,
            height: 512,
            focalX: 0.5,
            focalY: 0.25,
            createdAt: Date.parse('2024-04-30T00:00:00.000Z'),
            updatedAt: Date.parse('2024-05-01T00:00:00.000Z'),
        });
        expect('storageId' in (row?.document ?? {})).toBe(false);
    });

    it('the plan is pure data — every record is JSON-serializable with no inline IO', () => {
        expect(JSON.parse(JSON.stringify(result.storagePlan))).toEqual(result.storagePlan);
    });
});

describe('caption flattening', () => {
    it('prefers the platform default locale (en-US)', () => {
        expect(transformCmsMedia([mediaDoc()]).cmsMedia[0]?.document.caption).toBe('Caption EN');
    });

    it('falls back to the lexicographically first string locale when en-US is absent', () => {
        const row = transformCmsMedia([
            mediaDoc({ caption: { 'sv-SE': 'Bildtext SV', 'de-DE': 'Bildunterschrift DE' } }),
        ]).cmsMedia[0];
        expect(row?.document.caption).toBe('Bildunterschrift DE');
    });

    it('passes a plain string caption through and omits an unresolvable one', () => {
        expect(transformCmsMedia([mediaDoc({ caption: 'plain' })]).cmsMedia[0]?.document.caption).toBe('plain');
        const absent = transformCmsMedia([mediaDoc({ caption: undefined })]).cmsMedia[0];
        expect('caption' in (absent?.document ?? {})).toBe(false);
    });
});

describe('determinism, purity, and skip conventions', () => {
    it('produces a byte-identical dataset on a re-run regardless of source order', () => {
        const a = mediaDoc();
        const b = mediaDoc({ _id: { $oid: MEDIA_B_ID }, filename: 'hero.jpg', mimeType: 'image/jpeg' });
        expect(JSON.stringify(transformCmsMedia([a, b]))).toBe(JSON.stringify(transformCmsMedia([b, a])));
    });

    it('never mutates the input', () => {
        const input = [mediaDoc()];
        const snapshot = structuredClone(input);
        transformCmsMedia(input);
        expect(input).toEqual(snapshot);
    });

    it('skips documents missing an id, tenant, filename, or mime type', () => {
        expect(
            transformCmsMedia([
                mediaDoc({ _id: undefined }),
                mediaDoc({ tenant: undefined }),
                mediaDoc({ filename: undefined }),
                mediaDoc({ mimeType: undefined }),
            ]).cmsMedia,
        ).toEqual([]);
    });
});
