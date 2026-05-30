import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockQuery } = vi.hoisted(() => {
    const q = {
        lean: vi.fn(),
        populate: vi.fn(),
        limit: vi.fn(),
        exec: vi.fn(),
    };
    q.lean.mockReturnValue(q);
    q.populate.mockReturnValue(q);
    q.limit.mockReturnValue(q);
    return { mockQuery: q };
});

vi.mock('mongoose', async () => {
    class MockModel {
        public static modelName = 'MockModel';
        public static find = vi.fn().mockReturnValue(mockQuery);
        public static findOne = vi.fn().mockReturnValue(mockQuery);
        public static findById = vi.fn().mockReturnValue(mockQuery);
        public static create = vi.fn().mockResolvedValue({});
        public static findOneAndUpdate = vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(null) });
        public limit = vi.fn().mockResolvedValue(this);
        public save = vi.fn().mockResolvedValue(this);
    }

    const values = {
        connect: vi.fn().mockResolvedValue({
            get models() {
                return new Proxy([], { get: () => MockModel });
            },
        }),
        set: vi.fn(),
    };

    return {
        ...(((await vi.importActual('mongoose')) as object) || {}),
        Model: MockModel,
        Document: {},
        ...values,
        connect: vi.fn().mockResolvedValue(values),
        default: { ...values },
    };
});

import { ReviewModel } from '../models';
import { Review } from './review';

const mockReview = { id: 'rev-1', shop: 'shop-1', rating: 5, body: 'great' };

beforeEach(() => {
    mockQuery.exec.mockReset();
    mockQuery.lean.mockClear();
    mockQuery.limit.mockClear();
    vi.mocked(ReviewModel.find).mockClear();
});

afterEach(() => {
    vi.clearAllMocks();
});

describe('ReviewService.findByShop (Mongoose-backed)', () => {
    it('queries ReviewModel.find with a shop filter', async () => {
        mockQuery.exec.mockResolvedValueOnce([mockReview]);
        await Review.findByShop('shop-1');
        expect(ReviewModel.find).toHaveBeenCalledWith({ shop: 'shop-1' });
    });

    it('applies the count as a limit when provided', async () => {
        mockQuery.exec.mockResolvedValueOnce([mockReview]);
        await Review.findByShop('shop-1', { count: 10 });
        expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    it('omits the limit when count is not provided', async () => {
        mockQuery.exec.mockResolvedValueOnce([mockReview]);
        await Review.findByShop('shop-1');
        expect(mockQuery.limit).not.toHaveBeenCalled();
    });

    it('returns mapped reviews', async () => {
        mockQuery.exec.mockResolvedValueOnce([mockReview]);
        const result = await Review.findByShop('shop-1');
        expect(result).toHaveLength(1);
        expect(result[0]?.id).toBe('rev-1');
    });

    it('returns an empty array when no reviews exist for the shop', async () => {
        mockQuery.exec.mockResolvedValueOnce([]);
        const result = await Review.findByShop('shop-empty');
        expect(result).toEqual([]);
    });
});

// Phase-0 regression gate for the Mongo→Convex migration (UNIFY-06 moves
// reviews onto `shopId`). These pin the CURRENT return SHAPE produced by
// `docToReview` so a later re-keying cannot silently change what callsites
// receive: Mongo internals (`_id`, `__v`) are stripped, `_id` is projected
// onto a string `id`, and embedded subdoc `_id`s are stripped recursively.
describe('ReviewService return-shape contract (characterization)', () => {
    it('projects a lean `_id` onto a string `id` and drops `_id`/`__v`', async () => {
        mockQuery.exec.mockResolvedValueOnce([{ _id: 'mongo-id-1', __v: 3, rating: 4, body: 'ok' }]);
        const [review] = await Review.findByShop('shop-1');
        expect(review).toEqual({ id: 'mongo-id-1', rating: 4, body: 'ok' });
        expect(review).not.toHaveProperty('_id');
        expect(review).not.toHaveProperty('__v');
    });

    it('keeps an existing string `id` rather than re-deriving it from `_id`', async () => {
        mockQuery.exec.mockResolvedValueOnce([{ _id: 'mongo-id-1', id: 'public-id-1', rating: 5 }]);
        const [review] = await Review.findByShop('shop-1');
        expect(review?.id).toBe('public-id-1');
    });

    it('strips `_id`/`__v` from embedded subdocuments recursively', async () => {
        mockQuery.exec.mockResolvedValueOnce([
            {
                _id: 'rev-1',
                shop: { _id: 'shop-oid', __v: 0, name: 'Acme', commerce: { _id: 'c-oid', id: 'gid://x' } },
            },
        ]);
        const [review] = await Review.findByShop('shop-1');
        expect(review).toEqual({ id: 'rev-1', shop: { name: 'Acme', commerce: { id: 'gid://x' } } });
    });
});

describe('ReviewService.findAll (Mongoose-backed)', () => {
    it('queries ReviewModel.find with no filter when tenant is not provided', async () => {
        mockQuery.exec.mockResolvedValueOnce([mockReview]);
        await Review.findAll();
        expect(ReviewModel.find).toHaveBeenCalledWith({});
    });

    it('queries with a tenant filter when provided', async () => {
        mockQuery.exec.mockResolvedValueOnce([mockReview]);
        await Review.findAll({ tenant: 'tenant-1' });
        expect(ReviewModel.find).toHaveBeenCalledWith({ tenant: 'tenant-1' });
    });

    it('returns mapped reviews', async () => {
        mockQuery.exec.mockResolvedValueOnce([mockReview, { ...mockReview, id: 'rev-2' }]);
        const result = await Review.findAll();
        expect(result).toHaveLength(2);
    });
});
