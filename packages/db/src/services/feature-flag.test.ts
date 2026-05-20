import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockQuery } = vi.hoisted(() => {
    const q = {
        lean: vi.fn(),
        populate: vi.fn(),
        exec: vi.fn(),
    };
    q.lean.mockReturnValue(q);
    q.populate.mockReturnValue(q);
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

import { FeatureFlagModel } from '../models';
import { FeatureFlag } from './feature-flag';

const mockFlag = { id: 'flag-1', key: 'accounts', defaultValue: false, targeting: [] };

beforeEach(() => {
    mockQuery.exec.mockReset();
    mockQuery.lean.mockClear();
    vi.mocked(FeatureFlagModel.find).mockClear();
    vi.mocked(FeatureFlagModel.findOne).mockClear();
});

afterEach(() => {
    vi.clearAllMocks();
});

describe('FeatureFlagService (Mongoose-backed)', () => {
    it('findByKey queries FeatureFlagModel.findOne with the given key', async () => {
        mockQuery.exec.mockResolvedValueOnce(mockFlag);
        const result = await FeatureFlag.findByKey('accounts');
        expect(FeatureFlagModel.findOne).toHaveBeenCalledWith({ key: 'accounts' });
        expect(result?.key).toBe('accounts');
    });

    it('findByKey returns null when no doc matches', async () => {
        mockQuery.exec.mockResolvedValueOnce(null);
        const result = await FeatureFlag.findByKey('missing');
        expect(result).toBeNull();
    });

    it('findAll returns all docs mapped through docToFeatureFlag', async () => {
        mockQuery.exec.mockResolvedValueOnce([mockFlag, { ...mockFlag, id: 'flag-2', key: 'beta' }]);
        const result = await FeatureFlag.findAll();
        expect(FeatureFlagModel.find).toHaveBeenCalledWith({});
        expect(result).toHaveLength(2);
        expect(result[0]?.key).toBe('accounts');
        expect(result[1]?.key).toBe('beta');
    });
});
