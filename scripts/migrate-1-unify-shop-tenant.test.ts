import { describe, expect, it } from 'vitest';
import {
    applyTenantRelink,
    buildTenantToShop,
    buildValidShopIds,
    type Doc,
    planTenantDoc,
    planTenantDocs,
    resolveCanonicalTenantId,
    TENANT_SCOPED_COLLECTIONS,
    type TenantLookup,
    tenantIsCanonical,
    toIdString,
} from './migrate-1-unify-shop-tenant';

/** A stand-in for a BSON `ObjectId`: the migration core reads ids via `toHexString`. */
const objectId = (hex: string): { toHexString: () => string } => ({ toHexString: () => hex });

const validShopIds = buildValidShopIds([{ _id: objectId('shop-a') }, { _id: objectId('shop-b') }]);
const tenantToShop = buildTenantToShop(
    [
        { _id: objectId('tenant-1'), shopId: 'shop-a' },
        { _id: objectId('tenant-2'), shopId: 'shop-b' },
        // Back-reference to a shop that no longer exists is dropped from the map.
        { _id: objectId('tenant-3'), shopId: 'ghost' },
    ],
    validShopIds,
);
const lookup: TenantLookup = { validShopIds, tenantToShop };

describe('TENANT_SCOPED_COLLECTIONS', () => {
    it('mirrors the CMS multi-tenant collection list', () => {
        expect(TENANT_SCOPED_COLLECTIONS).toEqual([
            'pages',
            'articles',
            'productMetadata',
            'collectionMetadata',
            'header',
            'footer',
            'businessData',
            'media',
            'reviews',
        ]);
    });
});

describe('buildTenantToShop', () => {
    it('keeps only rows whose shopId resolves to a valid shop', () => {
        expect(tenantToShop.get('tenant-1')).toBe('shop-a');
        expect(tenantToShop.get('tenant-2')).toBe('shop-b');
        expect(tenantToShop.has('tenant-3')).toBe(false);
    });
});

describe('resolveCanonicalTenantId', () => {
    it('returns a tenant that is already a valid shop id unchanged', () => {
        expect(resolveCanonicalTenantId('shop-a', lookup)).toBe('shop-a');
        expect(resolveCanonicalTenantId(objectId('shop-b'), lookup)).toBe('shop-b');
    });

    it('remaps a legacy tenant id to its back-referenced shop', () => {
        expect(resolveCanonicalTenantId(objectId('tenant-1'), lookup)).toBe('shop-a');
    });

    it('returns null for an unmappable tenant', () => {
        expect(resolveCanonicalTenantId(objectId('tenant-3'), lookup)).toBeNull();
        expect(resolveCanonicalTenantId(null, lookup)).toBeNull();
    });
});

describe('tenantIsCanonical', () => {
    it('is true when tenant already names a valid shop', () => {
        expect(tenantIsCanonical({ tenant: 'shop-a' }, validShopIds)).toBe(true);
    });

    it('is false for a stale tenant id', () => {
        expect(tenantIsCanonical({ tenant: objectId('tenant-1') }, validShopIds)).toBe(false);
    });
});

describe('planTenantDoc', () => {
    it('skips a document with no tenant field', () => {
        expect(planTenantDoc({}, lookup)).toEqual({ action: 'skip' });
    });

    it('skips a document already pointing at a valid shop', () => {
        expect(planTenantDoc({ tenant: 'shop-a' }, lookup)).toEqual({ action: 'skip' });
    });

    it('relinks a legacy tenant id to its canonical shop', () => {
        expect(planTenantDoc({ _id: objectId('p1'), tenant: objectId('tenant-2') }, lookup)).toEqual({
            action: 'relink',
            shopId: 'shop-b',
        });
    });

    it('marks an unmappable tenant unresolved', () => {
        expect(planTenantDoc({ tenant: objectId('tenant-3') }, lookup)).toEqual({ action: 'unresolved' });
    });
});

describe('planTenantDocs (the --dry-run count core)', () => {
    const docs: Doc[] = [
        { _id: objectId('p1'), tenant: 'shop-a' }, // already canonical
        { _id: objectId('p2'), tenant: objectId('tenant-1') }, // relink -> shop-a
        { _id: objectId('p3'), tenant: objectId('tenant-2') }, // relink -> shop-b
        { _id: objectId('p4'), tenant: objectId('tenant-3') }, // unresolved
        { _id: objectId('p5') }, // no tenant
    ];

    it('reports exact counts without mutating input', () => {
        const before = JSON.stringify(docs);
        const report = planTenantDocs(docs, lookup);
        expect(report.scanned).toBe(5);
        expect(report.alreadyCanonical).toBe(1);
        expect(report.relink).toBe(2);
        expect(report.unresolved).toBe(1);
        expect(report.noTenant).toBe(1);
        expect(report.relinks).toHaveLength(2);
        expect(JSON.stringify(docs)).toBe(before);
    });
});

describe('idempotency and canonical-id guarantee', () => {
    it('every relinked doc resolves to a valid canonical shop id', () => {
        const docs: Doc[] = [
            { _id: objectId('p2'), tenant: objectId('tenant-1') },
            { _id: objectId('p3'), tenant: objectId('tenant-2') },
        ];
        const report = planTenantDocs(docs, lookup);
        for (const { shopId } of report.relinks) expect(validShopIds.has(shopId)).toBe(true);
    });

    it('a relinked doc re-plans as a skip (second run is a no-op)', () => {
        const doc: Doc = { _id: objectId('p2'), tenant: objectId('tenant-1') };
        const plan = planTenantDoc(doc, lookup);
        expect(plan).toEqual({ action: 'relink', shopId: 'shop-a' });
        const relinked = applyTenantRelink(doc, plan.shopId as string);
        expect(relinked.tenant).toBe('shop-a');
        expect(planTenantDoc(relinked, lookup)).toEqual({ action: 'skip' });
    });

    it('a fully reconciled batch produces zero further relinks', () => {
        const docs: Doc[] = [
            { _id: objectId('p2'), tenant: objectId('tenant-1') },
            { _id: objectId('p3'), tenant: objectId('tenant-2') },
        ];
        const first = planTenantDocs(docs, lookup);
        const reconciled = first.relinks.map(({ doc, shopId }) => applyTenantRelink(doc, shopId));
        const second = planTenantDocs(reconciled, lookup);
        expect(second.relink).toBe(0);
        expect(second.alreadyCanonical).toBe(2);
    });
});

describe('toIdString', () => {
    it('reads an ObjectId via toHexString', () => {
        expect(toIdString(objectId('abc'))).toBe('abc');
    });
});
