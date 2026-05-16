import { describe, expect, it, vi } from 'vitest';

vi.mock('mongoose', async () => {
    const mockDocument = { _id: 'flag-1', key: 'accounts', defaultValue: false, targeting: [] };
    class MockModel {
        public static modelName = 'FeatureFlag';
        public static find = vi.fn().mockReturnThis();
        public static sort = vi.fn().mockReturnThis();
        public static limit = vi.fn().mockReturnThis();
        public static exec = vi.fn().mockResolvedValue([mockDocument]);
        public static create = vi.fn().mockResolvedValue(mockDocument);
        public static findById = vi.fn().mockResolvedValue(mockDocument);
        public static findOneAndUpdate = vi.fn().mockResolvedValue(mockDocument);
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
        ...(((await vi.importActual('mongoose')) as Record<string, unknown>) || {}),
        Model: MockModel,
        Document: {},
        ...values,
        connect: vi.fn().mockResolvedValue(values),
        default: { ...values },
    };
});

import { FeatureFlagService } from './feature-flag';

describe('services/feature-flag', () => {
    it('findByKey delegates to find with { key }', async () => {
        const svc = new FeatureFlagService();
        const findSpy = vi.spyOn(svc, 'find').mockResolvedValue({ key: 'accounts' } as never);
        await svc.findByKey('accounts');
        expect(findSpy).toHaveBeenCalledWith({ count: 1, filter: { key: 'accounts' } });
    });
});
