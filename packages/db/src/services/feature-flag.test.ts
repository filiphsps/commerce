import { beforeEach, describe, expect, it, vi } from 'vitest';

// Minimal mongoose stub — feature-flag.ts no longer touches Mongoose at runtime,
// but the transitive module graph (via ../models) imports schemas at evaluation.
vi.mock('mongoose', async () => {
    const actual = (await vi.importActual('mongoose')) as Record<string, unknown>;
    return {
        ...actual,
        connect: vi.fn().mockResolvedValue({
            get models() {
                return new Proxy({}, { get: () => ({ modelName: 'MockModel' }) });
            },
        }),
    };
});

import { FeatureFlag, FeatureFlagService } from './feature-flag';

describe('FeatureFlagService (via payload.local)', () => {
    const mockFlag = { id: 'flag-1', key: 'accounts', defaultValue: false, targeting: [] };

    let mockFind: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockFind = vi.fn().mockResolvedValue({ docs: [mockFlag] });
        FeatureFlag._setPayloadForTests({ find: mockFind } as never);
    });

    it('findByKey queries payload.find with key equality and returns the mapped doc', async () => {
        const result = await FeatureFlag.findByKey('accounts');
        expect(mockFind).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'feature-flags',
                where: { key: { equals: 'accounts' } },
                limit: 1,
                overrideAccess: true,
            }),
        );
        expect(result?.key).toBe('accounts');
    });

    it('findByKey returns null when no doc matches', async () => {
        mockFind.mockResolvedValueOnce({ docs: [] });
        const result = await FeatureFlag.findByKey('missing');
        expect(result).toBeNull();
    });

    it('findAll returns all docs mapped through docToFeatureFlag', async () => {
        mockFind.mockResolvedValueOnce({ docs: [mockFlag, { ...mockFlag, id: 'flag-2', key: 'beta' }] });
        const result = await FeatureFlag.findAll();
        expect(result).toHaveLength(2);
        expect(result[0]?.key).toBe('accounts');
        expect(result[1]?.key).toBe('beta');
    });

    it('throws when payload is not injected', () => {
        const svc = new FeatureFlagService();
        expect(() => svc.findByKey('accounts')).rejects.toThrow(/not initialized/);
    });
});
