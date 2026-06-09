import { getFunctionName } from 'convex/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// `Identity`, `Session`, and `User` are `Service` singletons over per-entity Convex backends.
// This file pins the SFREAD-02 base contract (NotFoundError on an empty single-result lookup,
// `[]` on an empty multi-result lookup) AND the seam translation — each frozen Mongoose-shaped
// call lands on the matching deployed `db/*` function with the server secret attached — on a
// mocked `ConvexHttpClient`, the only transport the re-homed seam owns.
const { queryMock, mutationMock } = vi.hoisted(() => ({ queryMock: vi.fn(), mutationMock: vi.fn() }));

vi.mock('convex/browser', () => ({
    // A real class: the lazy client in `src/db.ts` constructs it with `new`, which a `vi.fn`
    // arrow-implementation cannot satisfy.
    ConvexHttpClient: class {
        public query = queryMock;
        public mutation = mutationMock;
    },
}));

import { Identity } from './identity';
import { Session } from './session';
import { User } from './user';

/**
 * Resolves the Convex function path of the n-th call on a transport mock.
 *
 * @param mock - The mocked `query`/`mutation` transport method.
 * @param index - Call index, defaulting to the first call.
 * @returns The `module:function` path string.
 */
const calledFunction = (mock: ReturnType<typeof vi.fn>, index = 0): string => {
    const call = mock.mock.calls[index];
    expect(call).toBeDefined();
    return getFunctionName((call as unknown[])[0] as Parameters<typeof getFunctionName>[0]);
};

/**
 * Returns the args object of the n-th call on a transport mock.
 *
 * @param mock - The mocked `query`/`mutation` transport method.
 * @param index - Call index, defaulting to the first call.
 * @returns The args passed alongside the function reference.
 */
const calledArgs = (mock: ReturnType<typeof vi.fn>, index = 0): Record<string, unknown> => {
    const call = mock.mock.calls[index];
    expect(call).toBeDefined();
    return (call as unknown[])[1] as Record<string, unknown>;
};

const NOW = 1_700_000_000_000;

const userRow = {
    _id: 'usr_1',
    _creationTime: NOW,
    email: 'john@example.com',
    name: 'John Doe',
    emailVerified: null,
    identities: [],
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

describe('User (Convex-backed seam)', () => {
    it('find({ id }) resolves through db/users:byId with the server secret attached', async () => {
        queryMock.mockResolvedValueOnce(userRow);
        const result = await User.find({ id: 'usr_1' });

        expect(calledFunction(queryMock)).toBe('db/users:byId');
        expect(calledArgs(queryMock)).toEqual({ id: 'usr_1', serverSecret: 'test-server-secret' });
        expect(result).toMatchObject({ id: 'usr_1', email: 'john@example.com' });
        expect(result).not.toHaveProperty('_id');
        expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('find({ id }) throws NotFoundError when the lookup misses', async () => {
        queryMock.mockResolvedValueOnce(null);
        await expect(User.find({ id: 'missing' })).rejects.toMatchObject({ name: 'NotFoundError' });
    });

    it('find({ count: 1, filter: { email } }) resolves through db/users:byEmail', async () => {
        queryMock.mockResolvedValueOnce(userRow);
        const result = await User.find({ count: 1, filter: { email: 'john@example.com' } });

        expect(calledFunction(queryMock)).toBe('db/users:byEmail');
        expect(calledArgs(queryMock)).toMatchObject({ email: 'john@example.com' });
        expect(result.id).toBe('usr_1');
    });

    it('find({ count: 1, filter: { email } }) throws NotFoundError when no user matches', async () => {
        queryMock.mockResolvedValueOnce(null);
        await expect(User.find({ count: 1, filter: { email: 'nobody@example.com' } })).rejects.toMatchObject({
            name: 'NotFoundError',
        });
    });

    it('translates the identities $elemMatch filter onto db/users:byProviderIdentity', async () => {
        queryMock.mockResolvedValueOnce(userRow);
        await User.find({
            count: 1,
            filter: { identities: { $elemMatch: { provider: 'github', identity: '42' } } },
        });

        expect(calledFunction(queryMock)).toBe('db/users:byProviderIdentity');
        expect(calledArgs(queryMock)).toMatchObject({ provider: 'github', identity: '42' });
    });

    it('returns [] for an empty multi-result lookup rather than throwing', async () => {
        queryMock.mockResolvedValueOnce(null);
        const result = await User.find({ filter: { email: 'nobody@example.com' } });
        expect(result).toEqual([]);
    });

    it('create writes through db/users:create and rehydrates the stored row', async () => {
        mutationMock.mockResolvedValueOnce({ ...userRow, emailVerified: NOW });
        const result = await User.create({
            email: 'john@example.com',
            name: 'John Doe',
            avatar: undefined,
            emailVerified: new Date(NOW),
            identities: [],
        } as never);

        expect(calledFunction(mutationMock)).toBe('db/users:create');
        expect(calledArgs(mutationMock)).toMatchObject({
            email: 'john@example.com',
            name: 'John Doe',
            emailVerified: NOW,
            identities: [],
            serverSecret: 'test-server-secret',
        });
        expect(result.id).toBe('usr_1');
        expect(result.emailVerified).toEqual(new Date(NOW));
    });

    it('findById resolves null on a miss instead of throwing', async () => {
        queryMock.mockResolvedValueOnce(null);
        await expect(User.findById('missing')).resolves.toBeNull();
    });

    it('translates the $push identities update onto db/users:pushIdentity', async () => {
        const identity = {
            id: 'idn_1',
            provider: 'github',
            identity: '42',
            createdAt: new Date(NOW),
            updatedAt: new Date(NOW),
        } as never;
        mutationMock.mockResolvedValueOnce({
            ...userRow,
            identities: [{ id: 'idn_1', provider: 'github', identity: '42', createdAt: NOW, updatedAt: NOW }],
        });

        const result = await User.findOneAndUpdate({ _id: 'usr_1' } as never, { $push: { identities: identity } });

        expect(calledFunction(mutationMock)).toBe('db/users:pushIdentity');
        expect(calledArgs(mutationMock)).toMatchObject({
            userId: 'usr_1',
            identity: expect.objectContaining({ id: 'idn_1', provider: 'github', identity: '42' }),
        });
        expect(result?.identities[0]).toMatchObject({ id: 'idn_1', provider: 'github' });
        expect(result?.identities[0]?.createdAt).toBeInstanceOf(Date);
    });
});

describe('Identity (Convex-backed seam)', () => {
    it('upserts on (provider, identity) through db/identities:upsertByProviderIdentity', async () => {
        mutationMock.mockResolvedValueOnce({
            _id: 'idn_1',
            _creationTime: NOW,
            provider: 'github',
            identity: '42',
            scope: 'read:user',
            accessToken: 'at',
            createdAt: NOW,
            updatedAt: NOW,
        });

        const result = await Identity.findOneAndUpdate(
            { provider: 'github', identity: '42' } as never,
            {
                provider: 'github',
                identity: '42',
                scope: 'read:user',
                expiresAt: new Date(NOW),
                refreshToken: 'rt',
                accessToken: 'at',
            } as never,
            { upsert: true, new: true },
        );

        expect(calledFunction(mutationMock)).toBe('db/identities:upsertByProviderIdentity');
        expect(calledArgs(mutationMock)).toMatchObject({
            provider: 'github',
            identity: '42',
            scope: 'read:user',
            expiresAt: NOW,
            refreshToken: 'rt',
            accessToken: 'at',
            upsert: true,
            serverSecret: 'test-server-secret',
        });
        expect(result).toMatchObject({ id: 'idn_1', provider: 'github', identity: '42' });
        expect(result).not.toHaveProperty('_id');
    });

    it('resolves findOneAndUpdate to null when the pair is absent and upsert was not requested', async () => {
        mutationMock.mockResolvedValueOnce(null);
        const result = await Identity.findOneAndUpdate(
            { provider: 'github', identity: 'missing' } as never,
            {
                provider: 'github',
                identity: 'missing',
            } as never,
        );
        expect(result).toBeNull();
        expect(calledArgs(mutationMock)).toMatchObject({ upsert: false });
    });

    it('find by (provider, identity) returns [] on a multi-result miss', async () => {
        queryMock.mockResolvedValueOnce(null);
        const result = await Identity.find({ filter: { provider: 'github', identity: 'missing' } });
        expect(calledFunction(queryMock)).toBe('db/identities:byProviderIdentity');
        expect(result).toEqual([]);
    });

    it('find({ id }) throws NotFoundError when the lookup misses', async () => {
        queryMock.mockResolvedValueOnce(null);
        await expect(Identity.find({ id: 'missing' })).rejects.toMatchObject({ name: 'NotFoundError' });
    });
});

describe('Session (Convex-backed seam)', () => {
    const sessionPayload = {
        session: {
            _id: 'ses_1',
            _creationTime: NOW,
            user: 'usr_1',
            token: 'tok_1',
            expiresAt: NOW + 60_000,
            createdAt: NOW,
            updatedAt: NOW,
        },
        user: userRow,
    };

    it('create writes through db/sessions:create with the owning user id and epoch-ms expiry', async () => {
        mutationMock.mockResolvedValueOnce(sessionPayload);
        const user = { id: 'usr_1', email: 'john@example.com', name: 'John Doe' } as never;

        const session = await Session.create({
            user,
            token: 'tok_1',
            expiresAt: new Date(NOW + 60_000),
        } as never);

        expect(calledFunction(mutationMock)).toBe('db/sessions:create');
        expect(calledArgs(mutationMock)).toEqual({
            userId: 'usr_1',
            token: 'tok_1',
            expiresAt: NOW + 60_000,
            serverSecret: 'test-server-secret',
        });
        expect(session).toMatchObject({ id: 'ses_1', token: 'tok_1' });
        expect(session.expiresAt).toBeInstanceOf(Date);
        // The frozen contract populates the owning user, never a bare reference string.
        expect(session.user).toMatchObject({ id: 'usr_1', email: 'john@example.com' });
    });

    it('find by token resolves through db/sessions:byToken', async () => {
        queryMock.mockResolvedValueOnce(sessionPayload);
        const session = await Session.find({ count: 1, filter: { token: 'tok_1' } });

        expect(calledFunction(queryMock)).toBe('db/sessions:byToken');
        expect(calledArgs(queryMock)).toMatchObject({ token: 'tok_1' });
        expect(session.user.id).toBe('usr_1');
    });

    it('find({ id }) throws NotFoundError when the lookup misses', async () => {
        queryMock.mockResolvedValueOnce(null);
        await expect(Session.find({ id: 'missing' })).rejects.toMatchObject({ name: 'NotFoundError' });
    });

    it('findById resolves null on a miss instead of throwing', async () => {
        queryMock.mockResolvedValueOnce(null);
        await expect(Session.findById('missing')).resolves.toBeNull();
    });
});
