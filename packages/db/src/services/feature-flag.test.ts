import type { Payload } from 'payload';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

import { _resetPayloadRegistryForTests, registerPayload } from '../payload-registry';
import { FeatureFlag } from './feature-flag';

describe('FeatureFlagService (via payload.local)', () => {
    const mockFlag = { id: 'flag-1', key: 'accounts', defaultValue: false, targeting: [] };

    let mockFind: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockFind = vi.fn().mockResolvedValue({ docs: [mockFlag] });
        registerPayload(() => Promise.resolve({ find: mockFind } as unknown as Payload));
    });

    afterEach(() => {
        _resetPayloadRegistryForTests();
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
});
