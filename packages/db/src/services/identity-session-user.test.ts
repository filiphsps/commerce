import { getFunctionName } from 'convex/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// `User` is a `Service` singleton over a per-entity Convex backend. This file pins the SFREAD-02 base
// contract (NotFoundError on an empty single-result lookup, `[]` on an empty multi-result lookup) AND
// the seam translation — each frozen Mongoose-shaped call lands on the matching deployed `db/users`
// function with the server secret attached — on a mocked `ConvexHttpClient`, the only transport the
// re-homed seam owns. The NextAuth-era `Identity`/`Session` seams were dropped with their tables.
const { queryMock, mutationMock } = vi.hoisted(() => ({ queryMock: vi.fn(), mutationMock: vi.fn() }));

vi.mock('convex/browser', () => ({
    // A real class: the lazy client in `src/db.ts` constructs it with `new`, which a `vi.fn`
    // arrow-implementation cannot satisfy.
    ConvexHttpClient: class {
        public query = queryMock;
        public mutation = mutationMock;
    },
}));

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
