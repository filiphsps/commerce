import { getFunctionName } from 'convex/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock, mutationMock } = vi.hoisted(() => ({ queryMock: vi.fn(), mutationMock: vi.fn() }));

vi.mock('convex/browser', () => ({
    // A real class: the lazy client in `src/db.ts` constructs it with `new`, which a `vi.fn`
    // arrow-implementation cannot satisfy.
    ConvexHttpClient: class {
        public query = queryMock;
        public mutation = mutationMock;
    },
}));

import { Review } from './review';

const NOW = 1_700_000_000_000;

/**
 * Resolves the Convex function path of the first transport call.
 *
 * @returns The `module:function` path string.
 */
const calledFunction = (): string => {
    const call = queryMock.mock.calls[0];
    expect(call).toBeDefined();
    return getFunctionName((call as unknown[])[0] as Parameters<typeof getFunctionName>[0]);
};

// The `db/reviews` functions already project the branded shopId onto the public shop id string.
const reviewPayload = { _id: 'rev-1', shop: 'shop-1', createdAt: NOW, updatedAt: NOW };

beforeEach(() => {
    queryMock.mockReset();
    mutationMock.mockReset();
});

afterEach(() => {
    vi.clearAllMocks();
});

describe('Review.findByShop (Convex-backed)', () => {
    it('queries db/reviews:byShop with the public shop id and the server secret', async () => {
        queryMock.mockResolvedValueOnce([reviewPayload]);
        await Review.findByShop('shop-1');

        expect(calledFunction()).toBe('db/reviews:byShop');
        expect(queryMock.mock.calls[0]?.[1]).toEqual({ shopId: 'shop-1', serverSecret: 'test-server-secret' });
    });

    it('forwards the count cap when provided', async () => {
        queryMock.mockResolvedValueOnce([reviewPayload]);
        await Review.findByShop('shop-1', { count: 10 });
        expect(queryMock.mock.calls[0]?.[1]).toMatchObject({ shopId: 'shop-1', count: 10 });
    });

    it('omits the count when not provided', async () => {
        queryMock.mockResolvedValueOnce([reviewPayload]);
        await Review.findByShop('shop-1');
        expect(queryMock.mock.calls[0]?.[1]).not.toHaveProperty('count');
    });

    it('returns mapped reviews', async () => {
        queryMock.mockResolvedValueOnce([reviewPayload]);
        const result = await Review.findByShop('shop-1');
        expect(result).toHaveLength(1);
        expect(result[0]?.id).toBe('rev-1');
    });

    it('returns an empty array when no reviews exist for the shop', async () => {
        queryMock.mockResolvedValueOnce([]);
        await expect(Review.findByShop('shop-empty')).resolves.toEqual([]);
    });
});

// Return-shape contract carried over from the Mongoose era: internals are stripped, the row id is
// projected onto a string `id`, and `shop` stays a plain string id ref (the unified shop row id),
// never an embedded shop snapshot.
describe('ReviewService return-shape contract (characterization)', () => {
    it('projects the row _id onto a string `id` and drops internals', async () => {
        queryMock.mockResolvedValueOnce([
            { _id: 'rev-1', _creationTime: NOW, shop: 'shop-1', createdAt: NOW, updatedAt: NOW },
        ]);
        const [review] = await Review.findByShop('shop-1');
        expect(review?.id).toBe('rev-1');
        expect(review).not.toHaveProperty('_id');
        expect(review).not.toHaveProperty('_creationTime');
    });

    it('keeps an existing string `id` rather than re-deriving it from `_id`', async () => {
        queryMock.mockResolvedValueOnce([{ _id: 'rev-1', id: 'public-id-1', shop: 'shop-1' }]);
        const [review] = await Review.findByShop('shop-1');
        expect(review?.id).toBe('public-id-1');
    });

    it('carries `shop` through as a string id ref (no embedded shop snapshot)', async () => {
        queryMock.mockResolvedValueOnce([reviewPayload]);
        const [review] = await Review.findByShop('shop-1');
        expect(typeof review?.shop).toBe('string');
        expect(review?.shop).toBe('shop-1');
    });

    it('rehydrates the managed timestamps into Dates', async () => {
        queryMock.mockResolvedValueOnce([reviewPayload]);
        const [review] = await Review.findByShop('shop-1');
        expect(review?.createdAt).toEqual(new Date(NOW));
        expect(review?.updatedAt).toEqual(new Date(NOW));
    });
});

describe('Review.findAll (Convex-backed)', () => {
    it('queries db/reviews:findAll when no tenant filter is provided', async () => {
        queryMock.mockResolvedValueOnce([reviewPayload]);
        const result = await Review.findAll();
        expect(calledFunction()).toBe('db/reviews:findAll');
        expect(result).toHaveLength(1);
    });

    it('preserves the dead tenant-filter semantics: a provided tenant matches nothing', async () => {
        const result = await Review.findAll({ tenant: 'tenant-1' });
        expect(result).toEqual([]);
        expect(queryMock).not.toHaveBeenCalled();
    });

    it('returns mapped reviews', async () => {
        queryMock.mockResolvedValueOnce([reviewPayload, { ...reviewPayload, _id: 'rev-2' }]);
        const result = await Review.findAll();
        expect(result).toHaveLength(2);
    });
});
