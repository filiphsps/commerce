import { describe, expect, it } from 'vitest';

import { lexicalToProseMirror } from '../../../packages/cms/src/editor/richtext/lexical-to-prosemirror';
import { lexicalDoc, paragraph } from '../../../packages/test-mongo/src/seed/fixtures/lexical';
import { type Doc, remapObjectId } from './id-remap';
import { transformCmsDocuments } from './shred-richtext';
import { applyLatestVersionPointers, transformCmsVersions } from './versions';

/** Stable source ids so every surrogate derivation is checkable. */
const ARTICLE_ID = '6630f1a2b3c4d5e6f7a8b9c0';
const SHOP_ID = '6630f1a2b3c4d5e6f7a8b9d1';
const V1_ID = '6630f1a2b3c4d5e6f7a8aa01';
const V2_ID = '6630f1a2b3c4d5e6f7a8aa02';
const V3_ID = '6630f1a2b3c4d5e6f7a8aa03';

const DOC_SURROGATE = remapObjectId('cmsDocuments', ARTICLE_ID);
const SHOP_SURROGATE = remapObjectId('shops', SHOP_ID);

/** `documentId -> shopId` map as `transformCmsDocuments` derives it for the fixture parent. */
const shopIdByDocument = { [DOC_SURROGATE]: SHOP_SURROGATE };

/**
 * Builds one raw Payload `_articles_versions` row in mongoexport extended JSON.
 *
 * @param id - The version row's source `ObjectId` hex.
 * @param title - The snapshot title (distinguishes versions in assertions).
 * @param updatedAt - The row's ISO `updatedAt` (the quiesce ordering key).
 * @param latest - Payload's latest-version pin.
 * @param status - The snapshot draft state.
 * @returns The raw version document.
 */
const versionRow = (id: string, title: string, updatedAt: string, latest: boolean, status = 'draft'): Doc => ({
    _id: { $oid: id },
    parent: { $oid: ARTICLE_ID },
    version: {
        tenant: { $oid: SHOP_ID },
        title: { 'en-US': title },
        body: { 'en-US': lexicalDoc([paragraph(`${title} body`)]) },
        _status: status,
    },
    latest,
    autosave: false,
    createdAt: { $date: updatedAt },
    updatedAt: { $date: updatedAt },
});

describe('acceptance #3 — _versions migrate with latestVersionId pointers intact', () => {
    // Shuffled input: chronological order must come from updatedAt, not array order.
    const raws = [
        versionRow(V2_ID, 'v2', '2024-05-02T00:00:00.000Z', false),
        versionRow(V3_ID, 'v3', '2024-05-03T00:00:00.000Z', true, 'published'),
        versionRow(V1_ID, 'v1', '2024-05-01T00:00:00.000Z', false),
    ];
    const result = transformCmsVersions('articles', raws, shopIdByDocument);

    it('emits all three versions in chronological (updatedAt) order', () => {
        expect(result.divergences).toEqual([]);
        expect(result.cmsVersions.map((row) => row.payloadId)).toEqual([
            remapObjectId('cmsVersions', V1_ID),
            remapObjectId('cmsVersions', V2_ID),
            remapObjectId('cmsVersions', V3_ID),
        ]);
    });

    it('remaps the parent pointer through the id map and stamps tenancy', () => {
        for (const row of result.cmsVersions) {
            expect(row.document.documentId).toBe(DOC_SURROGATE);
            expect(row.document.shopId).toBe(SHOP_SURROGATE);
            expect(row.document.collection).toBe('articles');
        }
    });

    it('points latestVersionId at the pinned latest version', () => {
        expect(result.latestVersionIdByDocument).toEqual({
            [DOC_SURROGATE]: remapObjectId('cmsVersions', V3_ID),
        });
    });

    it('points publishedVersionId at the chronologically last published snapshot', () => {
        expect(result.publishedVersionIdByDocument).toEqual({
            [DOC_SURROGATE]: remapObjectId('cmsVersions', V3_ID),
        });
    });

    it('applies both pointers onto the staged parent document row', () => {
        const parent = transformCmsDocuments('articles', [
            {
                _id: { $oid: ARTICLE_ID },
                tenant: { $oid: SHOP_ID },
                title: { 'en-US': 'live' },
                body: { 'en-US': lexicalDoc([paragraph('live body')]) },
            },
        ]);
        const pointed = applyLatestVersionPointers(parent.cmsDocuments, result);
        expect(pointed[0]?.document.latestVersionId).toBe(remapObjectId('cmsVersions', V3_ID));
        // The live row carries no `_status` → migrates as `published`, so the published pointer
        // lands too and Convex live reads keep serving the migrated published snapshot (G4FIX-01).
        expect(pointed[0]?.document.publishedVersionId).toBe(remapObjectId('cmsVersions', V3_ID));
        // Pure: the input row is untouched.
        expect(parent.cmsDocuments[0]?.document.latestVersionId).toBeUndefined();
        expect(parent.cmsDocuments[0]?.document.publishedVersionId).toBeUndefined();
    });

    it('withholds publishedVersionId from a draft live row and from a history with no published snapshot', () => {
        const draftParent = transformCmsDocuments('articles', [
            {
                _id: { $oid: ARTICLE_ID },
                tenant: { $oid: SHOP_ID },
                title: { 'en-US': 'live' },
                body: { 'en-US': lexicalDoc([paragraph('live body')]) },
                _status: 'draft',
            },
        ]);
        // A draft live row never gets the published pointer, even with published history.
        const pointed = applyLatestVersionPointers(draftParent.cmsDocuments, result);
        expect(pointed[0]?.document.latestVersionId).toBe(remapObjectId('cmsVersions', V3_ID));
        expect(pointed[0]?.document.publishedVersionId).toBeUndefined();

        // An all-draft history yields no published pointer for anyone.
        const allDrafts = transformCmsVersions(
            'articles',
            [versionRow(V1_ID, 'v1', '2024-05-01T00:00:00.000Z', true)],
            shopIdByDocument,
        );
        expect(allDrafts.publishedVersionIdByDocument).toEqual({});
    });

    it('converts snapshot rich text through the real codec and maps the draft state', () => {
        const v3 = result.cmsVersions[2];
        const snapshot = v3?.document.snapshot as { body: Record<string, unknown>; _status?: unknown };
        expect(JSON.stringify(snapshot.body['en-US'])).toBe(
            JSON.stringify(lexicalToProseMirror(lexicalDoc([paragraph('v3 body')]))),
        );
        expect(v3?.document.status).toBe('published');
        expect(result.cmsVersions[0]?.document.status).toBe('draft');
        // Bookkeeping never leaks into the snapshot.
        expect('_status' in (v3?.document.snapshot as Doc)).toBe(false);
        expect('tenant' in (v3?.document.snapshot as Doc)).toBe(false);
    });
});

describe('freeze-window quiesce — re-exported rows supersede idempotently', () => {
    it('a re-export of the same version id with a newer updatedAt replaces the stale row, never duplicating', () => {
        const stale = versionRow(V2_ID, 'v2-stale', '2024-05-02T00:00:00.000Z', false);
        const superseding = versionRow(V2_ID, 'v2-final', '2024-05-02T00:00:30.000Z', true);
        const result = transformCmsVersions('articles', [stale, superseding], shopIdByDocument);

        expect(result.cmsVersions).toHaveLength(1);
        const snapshot = result.cmsVersions[0]?.document.snapshot as { title: Record<string, string> };
        expect(snapshot.title['en-US']).toBe('v2-final');
        expect(result.latestVersionIdByDocument[DOC_SURROGATE]).toBe(remapObjectId('cmsVersions', V2_ID));
    });

    it('is deterministic: the same input yields a byte-identical dataset on a re-run', () => {
        const raws = [
            versionRow(V2_ID, 'v2', '2024-05-02T00:00:00.000Z', false),
            versionRow(V1_ID, 'v1', '2024-05-01T00:00:00.000Z', true),
        ];
        expect(JSON.stringify(transformCmsVersions('articles', raws, shopIdByDocument))).toBe(
            JSON.stringify(transformCmsVersions('articles', raws, shopIdByDocument)),
        );
    });

    it('falls back to the chronologically last version when no row is pinned latest', () => {
        const raws = [
            versionRow(V1_ID, 'v1', '2024-05-01T00:00:00.000Z', false),
            versionRow(V2_ID, 'v2', '2024-05-02T00:00:00.000Z', false),
        ];
        const result = transformCmsVersions('articles', raws, shopIdByDocument);
        expect(result.latestVersionIdByDocument[DOC_SURROGATE]).toBe(remapObjectId('cmsVersions', V2_ID));
    });
});

describe('quarantine and skip conventions', () => {
    it('quarantines a version whose snapshot has unconvertible rich text', () => {
        const poisoned: Doc = {
            ...versionRow(V1_ID, 'v1', '2024-05-01T00:00:00.000Z', true),
            version: {
                tenant: { $oid: SHOP_ID },
                body: { 'en-US': lexicalDoc([{ type: 'embed', version: 1 }]) },
                _status: 'draft',
            },
        };
        const result = transformCmsVersions('articles', [poisoned], shopIdByDocument);
        expect(result.cmsVersions).toEqual([]);
        expect(result.divergences[0]).toMatchObject({
            collection: 'articles',
            legacyId: V1_ID,
            fieldPath: 'body',
            locale: 'en-US',
        });
    });

    it('skips rows with no resolvable id, parent, snapshot, or shop', () => {
        const noParent = { ...versionRow(V1_ID, 'v1', '2024-05-01T00:00:00.000Z', false), parent: undefined };
        const noSnapshot = { ...versionRow(V2_ID, 'v2', '2024-05-02T00:00:00.000Z', false), version: 'broken' };
        const orphan = versionRow(V3_ID, 'v3', '2024-05-03T00:00:00.000Z', false);
        delete (orphan.version as Doc).tenant;

        expect(transformCmsVersions('articles', [noParent, noSnapshot], shopIdByDocument).cmsVersions).toEqual([]);
        // An orphan whose parent is missing from the document map still resolves through its own
        // snapshot tenant ref; with neither, it is skipped.
        expect(transformCmsVersions('articles', [orphan], {}).cmsVersions).toEqual([]);
        expect(
            transformCmsVersions('articles', [versionRow(V3_ID, 'v3', '2024-05-03T00:00:00.000Z', false)], {}),
        ).toMatchObject({ cmsVersions: [{ document: { shopId: SHOP_SURROGATE } }] });
    });
});
