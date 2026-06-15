import { Error as CommerceError } from '@nordcom/commerce-errors';
import { getFunctionName } from 'convex/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The Convex transport double: `ShopService` reaches the deployed `db/shops` functions exclusively
// through a lazy `ConvexHttpClient`, so mocking it pins the SFREAD-02 golden contract (masking,
// id projection, NotFound errors, findAll's []-swallow, taint) on the re-homed seam.
const { queryMock, mutationMock, taintMock } = vi.hoisted(() => ({
    queryMock: vi.fn(),
    mutationMock: vi.fn(),
    taintMock: vi.fn(),
}));

vi.mock('convex/browser', () => ({
    // A real class: the lazy client in `src/db.ts` constructs it with `new`, which a `vi.fn`
    // arrow-implementation cannot satisfy.
    ConvexHttpClient: class {
        public query = queryMock;
        public mutation = mutationMock;
    },
}));

// The taint helper resolves React dynamically; mock it so the re-taint of deserialized secrets is
// observable in a plain Node test runtime.
vi.mock('react', () => ({ experimental_taintUniqueValue: taintMock }));

import { Shop } from './shop';

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

/**
 * Resolves the Convex function path of the first transport MUTATION call.
 *
 * @returns The `module:function` path string.
 */
const calledMutation = (): string => {
    const call = mutationMock.mock.calls[0];
    expect(call).toBeDefined();
    return getFunctionName((call as unknown[])[0] as Parameters<typeof getFunctionName>[0]);
};

const shopRow = {
    _id: 'cvx-shop-1',
    _creationTime: NOW,
    legacyId: 'shop-legacy-1',
    name: 'Acme',
    domain: 'acme.test',
    alternativeDomains: ['acme-alt.test'],
    i18n: { defaultLocale: 'en-US' },
    design: { header: { logo: { src: '/l', alt: 'l', width: 1, height: 1 } }, accents: [] },
    commerceProvider: {
        type: 'shopify',
        authentication: {
            publicToken: 'pt',
            domain: 'shopify.com',
            customers: { id: 'cid', clientId: 'client-id' },
        },
        storefrontId: 's',
        domain: 'acme.test',
        id: 'cp',
    },
    createdAt: NOW,
    updatedAt: NOW,
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

const publicPayload = { shop: shopRow, flags: [flagRow] };
const sensitivePayload = { ...publicPayload, credentials: { token: 'SECRET', clientSecret: 'CLIENT_SECRET' } };

beforeEach(() => {
    queryMock.mockReset();
    mutationMock.mockReset();
    taintMock.mockClear();
});

afterEach(() => {
    vi.clearAllMocks();
});

describe('Shop.findByDomain (Convex-backed)', () => {
    it('resolves the masked read through db/shops:byDomain with the server secret attached', async () => {
        queryMock.mockResolvedValueOnce(publicPayload);
        await Shop.findByDomain('acme.test');

        expect(calledFunction()).toBe('db/shops:byDomain');
        expect(queryMock.mock.calls[0]?.[1]).toEqual({ domain: 'acme.test', serverSecret: 'test-server-secret' });
    });

    it('never carries token/clientSecret on the public read (structural masking)', async () => {
        queryMock.mockResolvedValueOnce(publicPayload);
        const result = await Shop.findByDomain('acme.test');
        const cp = (result as { commerceProvider: { authentication: Record<string, unknown> } }).commerceProvider;
        expect(cp.authentication.token).toBeUndefined();
        expect(cp.authentication.publicToken).toBe('pt');
        expect((cp.authentication.customers as Record<string, unknown>).clientSecret).toBeUndefined();
    });

    it('projects the legacy Mongo id onto shop.id and never surfaces the Convex _id', async () => {
        queryMock.mockResolvedValueOnce(publicPayload);
        const result = (await Shop.findByDomain('acme.test')) as Record<string, unknown>;
        expect(result.id).toBe('shop-legacy-1');
        expect(result).not.toHaveProperty('_id');
        expect(result).not.toHaveProperty('_creationTime');
        expect(result).not.toHaveProperty('legacyId');
    });

    it('always resolves the feature-flag join (populate is inert but satisfied)', async () => {
        queryMock.mockResolvedValueOnce(publicPayload);
        const result = (await Shop.findByDomain('acme.test', { populate: ['featureFlags.flag'] })) as {
            featureFlags?: { flag: { id?: string; key?: string } }[];
        };
        expect(result.featureFlags?.[0]?.flag).toMatchObject({ id: 'flag-legacy-1', key: 'accounts' });
    });

    it('rehydrates the managed timestamps into Dates', async () => {
        queryMock.mockResolvedValueOnce(publicPayload);
        const result = (await Shop.findByDomain('acme.test')) as { createdAt: unknown; updatedAt: unknown };
        expect(result.createdAt).toEqual(new Date(NOW));
        expect(result.updatedAt).toEqual(new Date(NOW));
    });

    it('routes sensitiveData through db/shops:byDomainWithCredentials and re-attaches the secrets', async () => {
        queryMock.mockResolvedValueOnce(sensitivePayload);
        const result = await Shop.findByDomain('acme.test', { sensitiveData: true });

        expect(calledFunction()).toBe('db/shops:byDomainWithCredentials');
        const cp = (result as { commerceProvider: { authentication: Record<string, unknown> } }).commerceProvider;
        expect(cp.authentication.token).toBe('SECRET');
        expect((cp.authentication.customers as Record<string, unknown>).clientSecret).toBe('CLIENT_SECRET');
    });

    it('re-applies the React taint to both secrets after deserialization', async () => {
        queryMock.mockResolvedValueOnce(sensitivePayload);
        await Shop.findByDomain('acme.test', { sensitiveData: true });

        expect(taintMock).toHaveBeenCalledWith('Do not pass private tokens to the client', globalThis, 'SECRET');
        expect(taintMock).toHaveBeenCalledWith('Do not pass private tokens to the client', globalThis, 'CLIENT_SECRET');
    });

    it('does not taint on the masked read (no secret ever enters the process)', async () => {
        queryMock.mockResolvedValueOnce(publicPayload);
        await Shop.findByDomain('acme.test');
        expect(taintMock).not.toHaveBeenCalled();
    });

    it('projects id even on the sensitiveData read', async () => {
        queryMock.mockResolvedValueOnce(sensitivePayload);
        const result = (await Shop.findByDomain('acme.test', { sensitiveData: true })) as Record<string, unknown>;
        expect(result.id).toBe('shop-legacy-1');
        expect(result).not.toHaveProperty('_id');
    });

    it('honors an include-style projection with convert: false', async () => {
        queryMock.mockResolvedValueOnce(publicPayload);
        const result = (await Shop.findByDomain('acme.test', {
            convert: false,
            projection: { domain: 1, 'i18n.defaultLocale': 1 },
        })) as Record<string, unknown>;

        expect(result.domain).toBe('acme.test');
        expect(result.i18n).toEqual({ defaultLocale: 'en-US' });
        expect(result.id).toBe('shop-legacy-1');
        expect(result).not.toHaveProperty('name');
    });

    it('returns the full raw doc when convert: false without a projection', async () => {
        queryMock.mockResolvedValueOnce(publicPayload);
        const result = (await Shop.findByDomain('acme.test', { convert: false })) as Record<string, unknown>;
        expect(result.name).toBe('Acme');
        expect(result).not.toHaveProperty('_id');
    });

    it('throws UnknownShopDomainError when no shop matches', async () => {
        queryMock.mockResolvedValueOnce(null);
        await expect(Shop.findByDomain('missing.test')).rejects.toMatchObject({
            name: 'UnknownShopDomainError',
            code: 'API_UNKNOWN_SHOP_DOMAIN',
        });
    });

    it('throws InvalidShopDomainError for an empty domain', async () => {
        queryMock.mockResolvedValueOnce(null);
        await expect(Shop.findByDomain('')).rejects.toMatchObject({ name: 'InvalidShopDomainError' });
    });
});

describe('Shop.findById (Convex-backed)', () => {
    it('resolves through db/shops:byId with the public (legacy) id', async () => {
        queryMock.mockResolvedValueOnce(publicPayload);
        const result = await Shop.findById('shop-legacy-1');

        expect(calledFunction()).toBe('db/shops:byId');
        expect(queryMock.mock.calls[0]?.[1]).toMatchObject({ id: 'shop-legacy-1' });
        expect((result as { id: string }).id).toBe('shop-legacy-1');
    });

    it('strips the auth token from the returned doc', async () => {
        queryMock.mockResolvedValueOnce(publicPayload);
        const result = await Shop.findById('shop-legacy-1');
        const cp = (result as { commerceProvider: { authentication: Record<string, unknown> } }).commerceProvider;
        expect(cp.authentication.token).toBeUndefined();
    });

    it('throws UnknownShopIdError when no shop matches', async () => {
        queryMock.mockResolvedValueOnce(null);
        await expect(Shop.findById('missing')).rejects.toMatchObject({
            name: 'UnknownShopIdError',
            code: 'API_UNKNOWN_SHOP_ID',
        });
    });
});

describe('Shop.findAll (Convex-backed)', () => {
    it('resolves every shop through db/shops:findAll, masked', async () => {
        queryMock.mockResolvedValueOnce([shopRow, { ...shopRow, legacyId: 'shop-legacy-2', domain: 'beta.test' }]);
        const result = await Shop.findAll();

        expect(calledFunction()).toBe('db/shops:findAll');
        expect(result).toHaveLength(2);
        for (const shop of result) {
            const cp = (shop as { commerceProvider: { authentication: Record<string, unknown> } }).commerceProvider;
            expect(cp.authentication.token).toBeUndefined();
        }
    });

    it('returns an empty array when no shops exist', async () => {
        queryMock.mockResolvedValueOnce([]);
        await expect(Shop.findAll()).resolves.toEqual([]);
    });

    it('swallows transport errors and returns an empty array', async () => {
        queryMock.mockRejectedValueOnce(new TypeError('convex down'));
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = await Shop.findAll();
        expect(result).toEqual([]);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
    });
});

describe('Shop.findByCollaborator (Convex-backed)', () => {
    const collaboratedPayload = [
        {
            shop: { ...shopRow, legacyId: 'shop-99', domain: 'collab.test' },
            collaborators: [{ user: 'user-123', permissions: ['admin'] }],
        },
    ];

    it('queries db/shops:byCollaborator with the user id', async () => {
        queryMock.mockResolvedValueOnce(collaboratedPayload);
        await Shop.findByCollaborator({ collaboratorId: 'user-123' });

        expect(calledFunction()).toBe('db/shops:byCollaborator');
        expect(queryMock.mock.calls[0]?.[1]).toMatchObject({ userId: 'user-123' });
    });

    it('forwards the email as the stable identity when supplied', async () => {
        queryMock.mockResolvedValueOnce(collaboratedPayload);
        await Shop.findByCollaborator({ collaboratorId: 'stale-id', email: 'owner@test' });

        expect(queryMock.mock.calls[0]?.[1]).toMatchObject({ userId: 'stale-id', email: 'owner@test' });
    });

    it('resolves the collaborator as an id-ref join row (no embedded user)', async () => {
        queryMock.mockResolvedValueOnce(collaboratedPayload);
        const result = await Shop.findByCollaborator({ collaboratorId: 'user-123' });
        const collaborators = (result[0] as { collaborators?: Array<{ user: unknown; permissions: unknown }> })
            ?.collaborators;
        expect(collaborators).toEqual([{ user: 'user-123', permissions: ['admin'] }]);
        expect(typeof collaborators?.[0]?.user).toBe('string');
    });

    it('strips auth tokens from results', async () => {
        queryMock.mockResolvedValueOnce(collaboratedPayload);
        const result = await Shop.findByCollaborator({ collaboratorId: 'user-123' });
        const cp = (result[0] as { commerceProvider: { authentication: Record<string, unknown> } } | undefined)
            ?.commerceProvider;
        expect(cp?.authentication.token).toBeUndefined();
        expect(cp?.authentication.publicToken).toBe('pt');
    });

    it('returns an empty array when no shops match', async () => {
        queryMock.mockResolvedValueOnce([]);
        await expect(Shop.findByCollaborator({ collaboratorId: 'nobody' })).resolves.toEqual([]);
    });
});

// The seam-shaped create input: secrets embedded on the provider (the frozen ShopBase shape), which
// the write path must split out before anything crosses the wire.
const createInput = {
    name: 'Acme',
    domain: 'acme.test',
    alternativeDomains: ['acme-alt.test'],
    design: { header: { logo: { src: '/l', alt: 'l', width: 1, height: 1 } }, accents: [] },
    commerceProvider: {
        type: 'shopify' as const,
        authentication: {
            token: 'SECRET',
            publicToken: 'pt',
            domain: 'shopify.com',
            customers: { id: 'cid', clientId: 'client-id', clientSecret: 'CLIENT_SECRET' },
        },
        storefrontId: 's',
        domain: 'acme.test',
        id: 'cp',
    },
    collaborators: [{ user: 'user-1', permissions: ['admin'] }],
};

const writePayload = { shop: shopRow, collaborators: [{ user: 'user-1', permissions: ['admin'] }] };

describe('Shop.create (Convex-backed)', () => {
    it('performs exactly ONE Convex mutation through db/shop_write:upsertShop', async () => {
        mutationMock.mockResolvedValueOnce(writePayload);
        await Shop.create(createInput);

        expect(mutationMock).toHaveBeenCalledTimes(1);
        expect(queryMock).not.toHaveBeenCalled();
        expect(calledMutation()).toBe('db/shop_write:upsertShop');
    });

    it('splits the secrets off the wire payload into the credentials bag (structural write masking)', async () => {
        mutationMock.mockResolvedValueOnce(writePayload);
        await Shop.create(createInput);

        const args = mutationMock.mock.calls[0]?.[1] as {
            shop: { commerceProvider: { authentication: Record<string, unknown> } };
            credentials: Record<string, unknown>;
            collaborators: unknown;
            serverSecret: string;
        };
        expect(args.credentials).toEqual({ token: 'SECRET', clientSecret: 'CLIENT_SECRET' });
        expect(args.shop.commerceProvider.authentication.token).toBeUndefined();
        expect(
            (args.shop.commerceProvider.authentication.customers as Record<string, unknown>).clientSecret,
        ).toBeUndefined();
        expect(args.collaborators).toEqual([{ user: 'user-1', permissions: ['admin'] }]);
        expect(args.serverSecret).toBe('test-server-secret');
    });

    it('re-attaches the caller secrets and re-embeds collaborators on the returned doc', async () => {
        mutationMock.mockResolvedValueOnce(writePayload);
        const result = await Shop.create(createInput);

        expect(result.id).toBe('shop-legacy-1');
        expect(result).not.toHaveProperty('_id');
        expect(result.collaborators).toEqual([{ user: 'user-1', permissions: ['admin'] }]);
        const cp = result.commerceProvider as { authentication: Record<string, unknown> };
        expect(cp.authentication.token).toBe('SECRET');
        expect((cp.authentication.customers as Record<string, unknown>).clientSecret).toBe('CLIENT_SECRET');
    });
});

describe('Shop.findOneAndUpdate (Convex-backed)', () => {
    it('maps a $set update onto ONE upsertShop mutation keyed by the public id', async () => {
        mutationMock.mockResolvedValueOnce(writePayload);
        await Shop.findOneAndUpdate({ id: 'shop-legacy-1' }, { $set: { name: 'Acme 2', alternativeDomains: [] } });

        expect(mutationMock).toHaveBeenCalledTimes(1);
        expect(calledMutation()).toBe('db/shop_write:upsertShop');
        expect(mutationMock.mock.calls[0]?.[1]).toMatchObject({
            legacyId: 'shop-legacy-1',
            upsert: false,
            shop: { name: 'Acme 2', alternativeDomains: [] },
        });
    });

    it('passes the upsert option through to the mutation', async () => {
        mutationMock.mockResolvedValueOnce(writePayload);
        await Shop.findOneAndUpdate({ id: 'shop-legacy-1' }, { name: 'Acme 2' }, { upsert: true });
        expect(mutationMock.mock.calls[0]?.[1]).toMatchObject({ upsert: true });
    });

    it('resolves null when the mutation matches no shop (no upsert)', async () => {
        mutationMock.mockResolvedValueOnce(null);
        await expect(Shop.findOneAndUpdate({ id: 'missing' }, { name: 'X' })).resolves.toBeNull();
    });

    it('throws TodoError for an unsupported filter shape', async () => {
        await expect(Shop.findOneAndUpdate({ domain: 'acme.test' }, { name: 'X' })).rejects.toSatisfy(
            CommerceError.isTodo,
        );
        expect(mutationMock).not.toHaveBeenCalled();
    });
});

describe('Shop.getDomainVerification (Convex-backed)', () => {
    it('resolves through db/shops:domainVerification with the server secret attached', async () => {
        queryMock.mockResolvedValueOnce({ domain: 'shop.acme.com', status: 'pending' });
        const result = await Shop.getDomainVerification('shop.acme.com');

        expect(calledFunction()).toBe('db/shops:domainVerification');
        expect(queryMock.mock.calls[0]?.[1]).toEqual({ domain: 'shop.acme.com', serverSecret: 'test-server-secret' });
        expect(result).toEqual({
            domain: 'shop.acme.com',
            status: 'pending',
            via: null,
            verifiedAt: null,
            lastCheckedAt: null,
        });
    });

    it('coalesces a legacy row (no status) to verified/service_domain', async () => {
        queryMock.mockResolvedValueOnce({ domain: 'legacy.acme.com' });
        const result = await Shop.getDomainVerification('legacy.acme.com');
        expect(result).toMatchObject({ status: 'verified', via: 'service_domain' });
    });

    it('returns null for an unknown domain', async () => {
        queryMock.mockResolvedValueOnce(null);
        expect(await Shop.getDomainVerification('ghost.acme.com')).toBeNull();
    });
});

describe('Shop.setDomainVerification (Convex-backed)', () => {
    it('forwards the write to db/shop_domain_write:setDomainVerification', async () => {
        mutationMock.mockResolvedValueOnce({ ok: true });
        await Shop.setDomainVerification('shop.acme.com', { status: 'verified', via: 'vercel', verifiedAt: 1 });

        expect(calledMutation()).toBe('db/shop_domain_write:setDomainVerification');
        expect(mutationMock.mock.calls[0]?.[1]).toMatchObject({
            domain: 'shop.acme.com',
            status: 'verified',
            via: 'vercel',
            verifiedAt: 1,
        });
    });
});
