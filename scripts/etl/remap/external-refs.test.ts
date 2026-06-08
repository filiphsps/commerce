import { describe, expect, it } from 'vitest';

import { remapObjectId } from '../transform/id-remap';
import { type SourceDataset, transform } from '../transform/index';
import {
    buildPublicShopIdIndex,
    EXTERNAL_SHOP_ID_SINKS,
    resolveExternalShopRef,
    verifyExternalShopRefs,
    verifyLegacyIdsPreserved,
} from './external-refs';

const SHOP_ID = '6630f1a2b3c4d5e6f7a8b9c0';

/** Golden source: one shop, enough to assert the public-id (legacyId) contract holds across the migration. */
const goldenInput: SourceDataset = {
    shops: [
        {
            _id: { $oid: SHOP_ID },
            name: 'Nordcom Demo',
            domain: 'nordcom-demo-shop.com',
            commerceProvider: { type: 'shopify', authentication: { publicToken: 'pub' } },
            createdAt: { $date: '2024-04-30T00:00:00.000Z' },
            updatedAt: { $date: '2024-05-01T00:00:00.000Z' },
        },
    ],
};

describe('EXTERNAL_SHOP_ID_SINKS', () => {
    it('enumerates the externally-persisted shopId sinks the invariant covers', () => {
        expect(EXTERNAL_SHOP_ID_SINKS).toEqual([
            'shopify-webhook-payload',
            'shopify-metafield',
            'client-cookie',
            'cached-isr-output',
        ]);
    });
});

describe('public shop.id == legacyId contract', () => {
    const dataset = transform(goldenInput);

    it('indexes the public id by legacyId, not by the surrogate payloadId (acceptance #2)', () => {
        const index = buildPublicShopIdIndex(dataset);
        expect(index.has(SHOP_ID)).toBe(true);
        expect(index.has(dataset.shops[0]!.payloadId)).toBe(false);
        expect(index.get(SHOP_ID)).toBe(dataset.shops[0]!.payloadId);
        expect(SHOP_ID).not.toBe(remapObjectId('shops', SHOP_ID));
    });

    it('resolves an externally-held shop.id through legacyId without rewriting it', () => {
        const index = buildPublicShopIdIndex(dataset);
        expect(resolveExternalShopRef(SHOP_ID, index)).toBe(dataset.shops[0]!.payloadId);
        expect(resolveExternalShopRef('deadbeefdeadbeefdeadbeef', index)).toBeNull();
    });

    it('verifies every shop preserved its legacyId', () => {
        expect(verifyLegacyIdsPreserved(dataset)).toEqual({ ok: true, missing: [] });
    });

    it('flags a shop row that lost its legacyId', () => {
        const broken = { shops: [{ payloadId: 'p1', document: {} }] } as unknown as ReturnType<typeof transform>;
        const result = verifyLegacyIdsPreserved(broken);
        expect(result.ok).toBe(false);
        expect(result.missing).toEqual(['p1']);
    });
});

describe('verifyExternalShopRefs — every external reference still resolves (acceptance #2)', () => {
    const dataset = transform(goldenInput);

    it('passes when every external id is a preserved legacyId', () => {
        expect(verifyExternalShopRefs(dataset, [SHOP_ID])).toEqual({ ok: true, unresolved: [] });
    });

    it('fails when an external id resolves to no live shop', () => {
        const result = verifyExternalShopRefs(dataset, [SHOP_ID, 'deadbeefdeadbeefdeadbeef']);
        expect(result.ok).toBe(false);
        expect(result.unresolved).toEqual(['deadbeefdeadbeefdeadbeef']);
    });
});
