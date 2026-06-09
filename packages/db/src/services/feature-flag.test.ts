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

import { FeatureFlag } from './feature-flag';

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

const flagRow = {
    _id: 'cvx-flag-1',
    _creationTime: NOW,
    legacyId: 'flag-legacy-1',
    key: 'accounts',
    defaultValue: false,
    targeting: [],
    createdAt: NOW,
    updatedAt: NOW,
};

beforeEach(() => {
    queryMock.mockReset();
    mutationMock.mockReset();
});

afterEach(() => {
    vi.clearAllMocks();
});

describe('FeatureFlagService (Convex-backed)', () => {
    it('findByKey queries db/feature_flags:byKey with the given key', async () => {
        queryMock.mockResolvedValueOnce(flagRow);
        const result = await FeatureFlag.findByKey('accounts');

        expect(calledFunction()).toBe('db/feature_flags:byKey');
        expect(queryMock.mock.calls[0]?.[1]).toEqual({ key: 'accounts', serverSecret: 'test-server-secret' });
        expect(result?.key).toBe('accounts');
    });

    it('findByKey projects the legacy id onto `id` and strips internals', async () => {
        queryMock.mockResolvedValueOnce(flagRow);
        const result = await FeatureFlag.findByKey('accounts');
        expect(result?.id).toBe('flag-legacy-1');
        expect(result).not.toHaveProperty('_id');
        expect(result).not.toHaveProperty('legacyId');
    });

    it('findByKey returns null when no flag matches (no throw)', async () => {
        queryMock.mockResolvedValueOnce(null);
        await expect(FeatureFlag.findByKey('missing')).resolves.toBeNull();
    });

    it('findAll returns all flags mapped through docToFeatureFlag', async () => {
        queryMock.mockResolvedValueOnce([flagRow, { ...flagRow, legacyId: 'flag-legacy-2', key: 'beta' }]);
        const result = await FeatureFlag.findAll();

        expect(calledFunction()).toBe('db/feature_flags:findAll');
        expect(result).toHaveLength(2);
        expect(result[0]?.key).toBe('accounts');
        expect(result[1]?.key).toBe('beta');
        expect(result[1]?.id).toBe('flag-legacy-2');
    });
});
