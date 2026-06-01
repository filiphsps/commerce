import { describe, expect, it } from 'vitest';
import {
    applyReviewShopId,
    buildShopLookup,
    type Doc,
    extractReviewShopCandidate,
    isEmbeddedShopReview,
    planReview,
    planReviews,
    resolveCanonicalShopId,
    type ShopLookup,
    toIdString,
} from './migrate-1-reviews-shopid';

/** A stand-in for a BSON `ObjectId`: the migration core reads ids via `toHexString`. */
const objectId = (hex: string): { toHexString: () => string } => ({ toHexString: () => hex });

const lookup: ShopLookup = buildShopLookup([
    { _id: objectId('shop-a'), domain: 'a.example.com' },
    { _id: objectId('shop-b'), domain: 'b.example.com' },
]);

describe('toIdString', () => {
    it('returns a trimmed non-empty string unchanged', () => {
        expect(toIdString('  shop-1  ')).toBe('shop-1');
    });

    it('returns null for an empty or whitespace string', () => {
        expect(toIdString('   ')).toBeNull();
    });

    it('reads an ObjectId via toHexString', () => {
        expect(toIdString(objectId('abc123'))).toBe('abc123');
    });

    it('reads an extended-JSON { $oid } wrapper', () => {
        expect(toIdString({ $oid: 'oid-1' })).toBe('oid-1');
    });

    it('reads a nested _id ObjectId off a sub-document', () => {
        expect(toIdString({ _id: objectId('nested-1'), domain: 'x' })).toBe('nested-1');
    });

    it('falls back to a string id field', () => {
        expect(toIdString({ id: 'plain-1' })).toBe('plain-1');
    });

    it('returns null for values with no derivable id', () => {
        expect(toIdString(42)).toBeNull();
        expect(toIdString(null)).toBeNull();
        expect(toIdString({ domain: 'x' })).toBeNull();
    });
});

describe('isEmbeddedShopReview', () => {
    it('is true when shop is an embedded object', () => {
        expect(isEmbeddedShopReview({ shop: { _id: objectId('shop-a'), domain: 'a.example.com' } })).toBe(true);
    });

    it('is false when shop is already a string id', () => {
        expect(isEmbeddedShopReview({ shop: 'shop-a' })).toBe(false);
    });

    it('is false when shop is absent', () => {
        expect(isEmbeddedShopReview({})).toBe(false);
    });
});

describe('extractReviewShopCandidate', () => {
    it('pulls both id and domain off the embedded snapshot', () => {
        expect(extractReviewShopCandidate({ shop: { _id: objectId('shop-a'), domain: 'a.example.com' } })).toEqual({
            id: 'shop-a',
            domain: 'a.example.com',
        });
    });

    it('yields null fields when shop is not an object', () => {
        expect(extractReviewShopCandidate({ shop: 'shop-a' })).toEqual({ id: null, domain: null });
    });
});

describe('resolveCanonicalShopId', () => {
    it('prefers a unique domain match', () => {
        expect(resolveCanonicalShopId({ id: 'stale-id', domain: 'b.example.com' }, lookup)).toBe('shop-b');
    });

    it('falls back to the embedded id when it is itself a known canonical id', () => {
        expect(resolveCanonicalShopId({ id: 'shop-a', domain: null }, lookup)).toBe('shop-a');
    });

    it('returns null when neither the domain nor the id resolves to a valid shop', () => {
        expect(resolveCanonicalShopId({ id: 'ghost', domain: 'ghost.example.com' }, lookup)).toBeNull();
    });
});

describe('planReview', () => {
    it('skips a review whose shop is already a string id', () => {
        expect(planReview({ shop: 'shop-a' }, lookup)).toEqual({ action: 'skip' });
    });

    it('rewrites an embedded review to its canonical shop id', () => {
        expect(
            planReview({ _id: objectId('rev-1'), shop: { _id: objectId('shop-a'), domain: 'a.example.com' } }, lookup),
        ).toEqual({ action: 'rewrite', shopId: 'shop-a' });
    });

    it('marks an embedded review unresolved when it matches no shop', () => {
        expect(planReview({ shop: { _id: objectId('ghost'), domain: 'ghost.example.com' } }, lookup)).toEqual({
            action: 'unresolved',
        });
    });
});

describe('planReviews (the --dry-run count core)', () => {
    const reviews: Doc[] = [
        { _id: objectId('rev-1'), shop: { _id: objectId('shop-a'), domain: 'a.example.com' } },
        { _id: objectId('rev-2'), shop: { _id: objectId('shop-b'), domain: 'b.example.com' } },
        { _id: objectId('rev-3'), shop: 'shop-a' },
        { _id: objectId('rev-4'), shop: { _id: objectId('ghost'), domain: 'ghost.example.com' } },
    ];

    it('reports exact counts without mutating input', () => {
        const before = JSON.stringify(reviews);
        const report = planReviews(reviews, lookup);
        expect(report.scanned).toBe(4);
        expect(report.embedded).toBe(3);
        expect(report.alreadyId).toBe(1);
        expect(report.rewrite).toBe(2);
        expect(report.unresolved).toBe(1);
        expect(report.rewrites).toHaveLength(2);
        expect(report.unresolvedDocs).toHaveLength(1);
        expect(JSON.stringify(reviews)).toBe(before);
    });
});

describe('idempotency', () => {
    it('a rewritten review re-plans as a skip (second run is a no-op)', () => {
        const review: Doc = { _id: objectId('rev-1'), shop: { _id: objectId('shop-a'), domain: 'a.example.com' } };
        const plan = planReview(review, lookup);
        expect(plan).toEqual({ action: 'rewrite', shopId: 'shop-a' });
        const rewritten = applyReviewShopId(review, plan.shopId as string);
        expect(rewritten.shop).toBe('shop-a');
        expect(planReview(rewritten, lookup)).toEqual({ action: 'skip' });
    });

    it('a fully migrated batch produces zero embedded reviews and zero further rewrites', () => {
        const reviews: Doc[] = [
            { _id: objectId('rev-1'), shop: { _id: objectId('shop-a'), domain: 'a.example.com' } },
            { _id: objectId('rev-2'), shop: { _id: objectId('shop-b'), domain: 'b.example.com' } },
        ];
        const first = planReviews(reviews, lookup);
        const migrated = first.rewrites.map(({ doc, shopId }) => applyReviewShopId(doc, shopId));
        expect(migrated.some(isEmbeddedShopReview)).toBe(false);
        const second = planReviews(migrated, lookup);
        expect(second.rewrite).toBe(0);
        expect(second.embedded).toBe(0);
        expect(second.alreadyId).toBe(2);
    });
});
