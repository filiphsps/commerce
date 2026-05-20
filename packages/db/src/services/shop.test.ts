import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mongoose connects at module evaluation (src/db.ts). Mock it so the module
// graph loads without a running MongoDB. The mock returns a chainable Query
// stub from `find`/`findOne`/`findById`; tests configure each test case by
// reassigning `mockQuery.exec.mockResolvedValueOnce(...)`.
//
// `vi.hoisted` runs before the `vi.mock` factory is hoisted, making `mockQuery`
// available both inside the factory and in test bodies.

const mockQuery = vi.hoisted(() => ({
    lean: vi.fn(),
    populate: vi.fn(),
    exec: vi.fn(),
}));

vi.mock('mongoose', async () => {
    mockQuery.lean.mockReturnValue(mockQuery);
    mockQuery.populate.mockReturnValue(mockQuery);

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

import { ShopModel } from '../models';
import { Shop } from './shop';

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

beforeEach(() => {
    mockQuery.exec.mockReset();
    mockQuery.lean.mockClear();
    mockQuery.populate.mockClear();
    vi.mocked(ShopModel.find).mockClear();
    vi.mocked(ShopModel.findOne).mockClear();
    vi.mocked(ShopModel.findById).mockClear();
});

afterEach(() => {
    vi.clearAllMocks();
});

describe('Shop.findByDomain (Mongoose-backed)', () => {
    it('queries ShopModel.findOne with an $or on domain + alternativeDomains', async () => {
        mockQuery.exec.mockResolvedValueOnce(mockShop);
        await Shop.findByDomain('acme.test');
        expect(ShopModel.findOne).toHaveBeenCalledWith({
            $or: [{ domain: 'acme.test' }, { alternativeDomains: 'acme.test' }],
        });
    });

    it('strips the auth token by default (sensitiveData: false)', async () => {
        mockQuery.exec.mockResolvedValueOnce(mockShop);
        const result = await Shop.findByDomain('acme.test');
        const cp = (result as { commerceProvider: { authentication: Record<string, unknown> } }).commerceProvider;
        expect(cp.authentication.token).toBeUndefined();
        expect(cp.authentication.publicToken).toBe('pt');
    });

    it('projects Mongo _id into a string id field (sensitiveData: false)', async () => {
        // Mongoose .lean() returns docs with _id but no `id`. The fixture's
        // baked-in `id` would mask the projection we're testing — strip it.
        const { id: _id_, ...rest } = mockShop;
        const docFromMongoose = { ...rest, _id: 'mongo-id-x' };
        mockQuery.exec.mockResolvedValueOnce(docFromMongoose);
        const result = (await Shop.findByDomain('acme.test')) as Record<string, unknown>;
        expect(result.id).toBe('mongo-id-x');
        expect(result).not.toHaveProperty('_id');
    });

    it('projects Mongo _id into a string id field (sensitiveData: true)', async () => {
        const { id: _id_, ...rest } = mockShop;
        const docFromMongoose = { ...rest, _id: 'mongo-id-x' };
        mockQuery.exec.mockResolvedValueOnce(docFromMongoose);
        const result = (await Shop.findByDomain('acme.test', { sensitiveData: true })) as Record<string, unknown>;
        expect(result.id).toBe('mongo-id-x');
        expect(result).not.toHaveProperty('_id');
    });

    it('preserves the auth token when sensitiveData: true', async () => {
        mockQuery.exec.mockResolvedValueOnce(mockShop);
        const result = await Shop.findByDomain('acme.test', { sensitiveData: true });
        const cp = (result as { commerceProvider: { authentication: Record<string, unknown> } }).commerceProvider;
        expect(cp.authentication.token).toBe('SECRET');
    });

    it('strips _id and __v even when sensitiveData: true', async () => {
        const docWithInternals = { ...mockShop, _id: 'mongo-id-x', __v: 0 };
        mockQuery.exec.mockResolvedValueOnce(docWithInternals);
        const result = (await Shop.findByDomain('acme.test', { sensitiveData: true })) as Record<string, unknown>;
        expect(result).not.toHaveProperty('_id');
        expect(result).not.toHaveProperty('__v');
    });

    it('returns the raw lean doc when convert: false', async () => {
        mockQuery.exec.mockResolvedValueOnce(mockShop);
        const result = await Shop.findByDomain('acme.test', { convert: false });
        expect(result).toBe(mockShop);
    });

    it('applies populate paths via Mongoose .populate()', async () => {
        mockQuery.exec.mockResolvedValueOnce(mockShop);
        await Shop.findByDomain('acme.test', { populate: ['featureFlags.flag'] });
        expect(mockQuery.populate).toHaveBeenCalledWith('featureFlags.flag');
    });

    it('does not call .populate() when no paths are supplied', async () => {
        mockQuery.exec.mockResolvedValueOnce(mockShop);
        await Shop.findByDomain('acme.test');
        expect(mockQuery.populate).not.toHaveBeenCalled();
    });

    it('throws UnknownShopDomainError when no shop matches', async () => {
        mockQuery.exec.mockResolvedValueOnce(null);
        await expect(Shop.findByDomain('missing.test')).rejects.toMatchObject({
            name: 'UnknownShopDomainError',
            code: 'API_UNKNOWN_SHOP_DOMAIN',
        });
    });
});

describe('Shop.findById (Mongoose-backed)', () => {
    const mockShopForId = { ...mockShop, id: 'shop-42' };

    it('calls ShopModel.findById with the given id', async () => {
        mockQuery.exec.mockResolvedValueOnce(mockShopForId);
        await Shop.findById('shop-42');
        expect(ShopModel.findById).toHaveBeenCalledWith('shop-42');
    });

    it('strips the auth token from the returned doc', async () => {
        mockQuery.exec.mockResolvedValueOnce(mockShopForId);
        const result = await Shop.findById('shop-42');
        const cp = (result as { commerceProvider: { authentication: Record<string, unknown> } }).commerceProvider;
        expect(cp.authentication.token).toBeUndefined();
    });

    it('throws UnknownShopIdError when no shop matches', async () => {
        mockQuery.exec.mockResolvedValueOnce(null);
        await expect(Shop.findById('missing')).rejects.toMatchObject({
            name: 'UnknownShopIdError',
            code: 'API_UNKNOWN_SHOP_ID',
        });
    });
});

describe('Shop.findAll (Mongoose-backed)', () => {
    const mockShops = [
        { ...mockShop, id: 'shop-1', domain: 'alpha.test' },
        { ...mockShop, id: 'shop-2', domain: 'beta.test' },
    ];

    it('calls ShopModel.find with no filter', async () => {
        mockQuery.exec.mockResolvedValueOnce(mockShops);
        await Shop.findAll();
        expect(ShopModel.find).toHaveBeenCalledWith({});
    });

    it('returns shops mapped through docToOnlineShop', async () => {
        mockQuery.exec.mockResolvedValueOnce(mockShops);
        const result = await Shop.findAll();
        expect(result).toHaveLength(2);
        for (const shop of result) {
            const cp = (shop as { commerceProvider: { authentication: Record<string, unknown> } }).commerceProvider;
            expect(cp.authentication.token).toBeUndefined();
        }
    });

    it('returns an empty array when no shops exist', async () => {
        mockQuery.exec.mockResolvedValueOnce([]);
        const result = await Shop.findAll();
        expect(result).toEqual([]);
    });

    it('swallows errors and returns an empty array', async () => {
        mockQuery.exec.mockRejectedValueOnce(new Error('mongo down'));
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = await Shop.findAll();
        expect(result).toEqual([]);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
    });
});

describe('Shop.findByCollaborator (Mongoose-backed)', () => {
    const mockShopForCollab = { ...mockShop, id: 'shop-99', domain: 'collab.test' };

    it('queries with a collaborators.user filter', async () => {
        mockQuery.exec.mockResolvedValueOnce([mockShopForCollab]);
        await Shop.findByCollaborator({ collaboratorId: 'user-123' });
        expect(ShopModel.find).toHaveBeenCalledWith({ 'collaborators.user': 'user-123' });
    });

    it('strips auth tokens from results', async () => {
        mockQuery.exec.mockResolvedValueOnce([mockShopForCollab]);
        const result = await Shop.findByCollaborator({ collaboratorId: 'user-123' });
        const cp = (result[0] as { commerceProvider: { authentication: Record<string, unknown> } } | undefined)
            ?.commerceProvider;
        expect(cp?.authentication.token).toBeUndefined();
        expect(cp?.authentication.publicToken).toBe('pt');
    });

    it('returns an empty array when no shops match', async () => {
        mockQuery.exec.mockResolvedValueOnce([]);
        const result = await Shop.findByCollaborator({ collaboratorId: 'nobody' });
        expect(result).toEqual([]);
    });
});
