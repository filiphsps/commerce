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

describe('Shop.findById (via payload.local)', () => {
    const mockShop = {
        id: 'shop-42',
        name: 'Beta',
        domain: 'beta.test',
        alternativeDomains: [],
        design: { header: { logo: { src: '/b', alt: 'b', width: 1, height: 1 } }, accents: [] },
        commerceProvider: {
            type: 'shopify',
            authentication: { token: 'SECRET', publicToken: 'pub', domain: 'shopify.com' },
            storefrontId: 's',
            domain: 'beta.test',
            id: 'cp',
        },
        contentProvider: { type: 'cms' },
    };

    let mockFindByID: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockFindByID = vi.fn().mockResolvedValue(mockShop);
        Shop._setPayloadForTests({ findByID: mockFindByID } as never);
    });

    it('calls payload.findByID with the given id and overrideAccess', async () => {
        await Shop.findById('shop-42');
        expect(mockFindByID).toHaveBeenCalledWith(
            expect.objectContaining({ collection: 'shops', id: 'shop-42', overrideAccess: true }),
        );
    });

    it('strips the auth token by default', async () => {
        const result = await Shop.findById('shop-42');
        const cp = (result as { commerceProvider: { authentication: Record<string, unknown> } }).commerceProvider;
        expect(cp.authentication.token).toBeUndefined();
        expect(cp.authentication.publicToken).toBe('pub');
    });

    it('throws when no shop matches', async () => {
        mockFindByID.mockResolvedValueOnce(null);
        await expect(Shop.findById('missing')).rejects.toThrow(/no shop/i);
    });
});

describe('Shop.findAll (via payload.local)', () => {
    const mockShops = [
        {
            id: 'shop-1',
            name: 'Alpha',
            domain: 'alpha.test',
            alternativeDomains: [],
            design: { header: { logo: { src: '/a', alt: 'a', width: 1, height: 1 } }, accents: [] },
            commerceProvider: {
                type: 'shopify',
                authentication: { token: 'T1', publicToken: 'p1', domain: 'shopify.com' },
                storefrontId: 's1',
                domain: 'alpha.test',
                id: 'cp1',
            },
            contentProvider: { type: 'cms' },
        },
        {
            id: 'shop-2',
            name: 'Beta',
            domain: 'beta.test',
            alternativeDomains: [],
            design: { header: { logo: { src: '/b', alt: 'b', width: 1, height: 1 } }, accents: [] },
            commerceProvider: {
                type: 'shopify',
                authentication: { token: 'T2', publicToken: 'p2', domain: 'shopify.com' },
                storefrontId: 's2',
                domain: 'beta.test',
                id: 'cp2',
            },
            contentProvider: { type: 'cms' },
        },
    ];

    let mockFind: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockFind = vi.fn().mockResolvedValue({ docs: mockShops });
        Shop._setPayloadForTests({ find: mockFind } as never);
    });

    it('calls payload.find with limit 0 and overrideAccess', async () => {
        await Shop.findAll();
        expect(mockFind).toHaveBeenCalledWith(
            expect.objectContaining({ collection: 'shops', limit: 0, overrideAccess: true }),
        );
    });

    it('returns an array mapped through docToOnlineShop', async () => {
        const result = await Shop.findAll();
        expect(result).toHaveLength(2);
    });

    it('strips auth tokens from all results', async () => {
        const result = await Shop.findAll();
        for (const shop of result) {
            const cp = (shop as { commerceProvider: { authentication: Record<string, unknown> } }).commerceProvider;
            expect(cp.authentication.token).toBeUndefined();
        }
    });

    it('returns an empty array when no shops exist', async () => {
        mockFind.mockResolvedValueOnce({ docs: [] });
        const result = await Shop.findAll();
        expect(result).toEqual([]);
    });
});

describe('Shop.findByCollaborator (via payload.local)', () => {
    const mockShop = {
        id: 'shop-99',
        name: 'Collab',
        domain: 'collab.test',
        alternativeDomains: [],
        design: { header: { logo: { src: '/c', alt: 'c', width: 1, height: 1 } }, accents: [] },
        commerceProvider: {
            type: 'shopify',
            authentication: { token: 'SECRET', publicToken: 'pt', domain: 'shopify.com' },
            storefrontId: 's',
            domain: 'collab.test',
            id: 'cp',
        },
        contentProvider: { type: 'cms' },
    };

    let mockFind: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockFind = vi.fn().mockResolvedValue({ docs: [mockShop] });
        Shop._setPayloadForTests({ find: mockFind } as never);
    });

    it('queries payload.find with a collaborators.user equals filter', async () => {
        await Shop.findByCollaborator({ collaboratorId: 'user-123' });
        expect(mockFind).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'shops',
                where: { 'collaborators.user': { equals: 'user-123' } },
                overrideAccess: true,
            }),
        );
    });

    it('returns mapped OnlineShop results', async () => {
        const result = await Shop.findByCollaborator({ collaboratorId: 'user-123' });
        expect(result).toHaveLength(1);
    });

    it('strips auth token from results', async () => {
        const result = await Shop.findByCollaborator({ collaboratorId: 'user-123' });
        const cp = (result[0] as { commerceProvider: { authentication: Record<string, unknown> } } | undefined)
            ?.commerceProvider;
        expect(cp?.authentication.token).toBeUndefined();
        expect(cp?.authentication.publicToken).toBe('pt');
    });

    it('returns an empty array when no shops match', async () => {
        mockFind.mockResolvedValueOnce({ docs: [] });
        const result = await Shop.findByCollaborator({ collaboratorId: 'nobody' });
        expect(result).toEqual([]);
    });
});
