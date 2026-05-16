import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mongoose connects at module evaluation (src/db.ts). Mock it so the module
// graph can load without a running MongoDB. findByDomain itself never touches
// Mongoose — it goes through Payload — but ShopModel (imported by shop.ts for
// the Service base class) transitively imports db.ts at load time.
vi.mock('mongoose', async () => {
    class MockModel {
        public static modelName = 'MockModel';
        public static find = vi.fn().mockReturnThis();
        public static sort = vi.fn().mockReturnThis();
        public static limit = vi.fn().mockReturnThis();
        public static exec = vi.fn().mockResolvedValue([]);
        public static create = vi.fn().mockResolvedValue({});
        public static findById = vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(null) });
        public static findOneAndUpdate = vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(null) });
        public static orFail = vi.fn().mockReturnThis();
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

import { Shop } from './shop';

describe('Shop.findByDomain (via payload.local)', () => {
    const mockShop = {
        id: 'doc-1',
        name: 'Acme',
        domain: 'acme.test',
        alternativeDomains: [],
        design: { header: { logo: { src: '/l', alt: 'l', width: 1, height: 1 } }, accents: [] },
        commerceProvider: {
            type: 'shopify',
            authentication: { token: 'SECRET', publicToken: 'pt', domain: 'shopify.com' },
            storefrontId: 's',
            domain: 'acme.test',
            id: 'cp',
        },
        contentProvider: { type: 'cms' },
    };

    let mockFind: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockFind = vi.fn().mockResolvedValue({ docs: [mockShop] });
        Shop._setPayloadForTests({ find: mockFind } as never);
    });

    it('queries payload.find with an OR on domain + alternativeDomains contains', async () => {
        await Shop.findByDomain('acme.test');
        expect(mockFind).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'shops',
                where: {
                    or: [{ domain: { equals: 'acme.test' } }, { alternativeDomains: { contains: 'acme.test' } }],
                },
                limit: 1,
                overrideAccess: true,
            }),
        );
    });

    it('strips the auth token by default (sensitiveData: false)', async () => {
        const result = await Shop.findByDomain('acme.test');
        const cp = (result as { commerceProvider: { authentication: Record<string, unknown> } }).commerceProvider;
        expect(cp.authentication.token).toBeUndefined();
        expect(cp.authentication.publicToken).toBe('pt');
    });

    it('preserves the auth token when sensitiveData: true', async () => {
        const result = await Shop.findByDomain('acme.test', { sensitiveData: true });
        const cp = (result as { commerceProvider: { authentication: Record<string, unknown> } }).commerceProvider;
        expect(cp.authentication.token).toBe('SECRET');
    });

    it('returns the raw doc when convert: false', async () => {
        const result = await Shop.findByDomain('acme.test', { convert: false });
        expect(result).toBe(mockShop);
    });

    it('uses depth 2 when populate paths are supplied', async () => {
        await Shop.findByDomain('acme.test', { populate: ['featureFlags.flag'] });
        expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ depth: 2 }));
    });

    it('uses depth 0 by default', async () => {
        await Shop.findByDomain('acme.test');
        expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ depth: 0 }));
    });

    it('throws when no shop matches', async () => {
        mockFind.mockResolvedValueOnce({ docs: [] });
        await expect(Shop.findByDomain('missing.test')).rejects.toThrow(/no shop/i);
    });
});
