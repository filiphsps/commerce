import { beforeEach, describe, expect, it, vi } from 'vitest';

// ------------------------------------------------------------------
// Hoisted mock fns
// ------------------------------------------------------------------

const { mockRedirect, mockNotFound, mockAuth, mockFindByDomain, mockGetPayload } = vi.hoisted(() => ({
    mockRedirect: vi.fn((url: string): never => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    }),
    mockNotFound: vi.fn((): never => {
        throw new Error('NEXT_NOT_FOUND');
    }),
    mockAuth: vi.fn(),
    mockFindByDomain: vi.fn(),
    mockGetPayload: vi.fn(),
}));

// ------------------------------------------------------------------
// Mocks
// ------------------------------------------------------------------

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
    redirect: mockRedirect,
    notFound: mockNotFound,
}));

vi.mock('@/auth', () => ({ auth: mockAuth }));

vi.mock('@nordcom/commerce-db', () => ({
    Shop: { findByDomain: mockFindByDomain },
}));

vi.mock('@nordcom/commerce-errors', () => ({
    Error: { isNotFound: (e: unknown) => e instanceof globalThis.Error && e.message === 'NOT_FOUND' },
}));

vi.mock('payload', () => ({
    getPayload: mockGetPayload,
}));

vi.mock('@/payload.config', () => ({ default: {} }));

// ------------------------------------------------------------------
// Import SUT after all mocks are registered
// ------------------------------------------------------------------

import { getAuthedPayloadCtx } from './payload-ctx';

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

const SESSION = { user: { email: 'admin@example.com', id: 'u1' }, expires: '2099-01-01' };

const USER_DOC = {
    id: 'user-doc-1',
    email: 'admin@example.com',
    role: 'admin',
};

const TENANT_DOC = {
    id: 'tenant-doc-1',
    slug: 'acme',
    name: 'Acme Store',
};

const SHOP = { id: 'shop-1', domain: 'acme.example.com' };

function makePayload(overrides?: {
    userDocs?: unknown[];
    tenantDocs?: unknown[];
}): { find: ReturnType<typeof vi.fn> } {
    const { userDocs = [USER_DOC], tenantDocs = [TENANT_DOC] } = overrides ?? {};
    const find = vi.fn().mockImplementation(({ collection }: { collection: string }) => {
        if (collection === 'users') return Promise.resolve({ docs: userDocs });
        if (collection === 'tenants') return Promise.resolve({ docs: tenantDocs });
        return Promise.resolve({ docs: [] });
    });
    return { find };
}

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe('getAuthedPayloadCtx', () => {
    beforeEach(() => {
        mockAuth.mockReset();
        mockFindByDomain.mockReset();
        mockGetPayload.mockReset();
        mockRedirect.mockClear();
        mockNotFound.mockClear();
    });

    it('redirects unauthenticated — auth() returns null', async () => {
        mockAuth.mockResolvedValue(null);

        await expect(getAuthedPayloadCtx('acme.example.com')).rejects.toThrow('NEXT_REDIRECT:/auth/login/');
        expect(mockRedirect).toHaveBeenCalledWith('/auth/login/');
    });

    it('redirects unauthenticated — session has no email', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'u1' }, expires: '2099-01-01' });

        await expect(getAuthedPayloadCtx('acme.example.com')).rejects.toThrow('NEXT_REDIRECT:/auth/login/');
        expect(mockRedirect).toHaveBeenCalledWith('/auth/login/');
    });

    it('redirects to login when Payload user does not exist', async () => {
        mockAuth.mockResolvedValue(SESSION);
        mockGetPayload.mockResolvedValue(makePayload({ userDocs: [] }));

        await expect(getAuthedPayloadCtx('acme.example.com')).rejects.toThrow('NEXT_REDIRECT:/auth/login/');
        expect(mockRedirect).toHaveBeenCalledWith('/auth/login/');
    });

    it('calls notFound() when Shop.findByDomain throws a NotFoundError', async () => {
        mockAuth.mockResolvedValue(SESSION);
        mockGetPayload.mockResolvedValue(makePayload());
        mockFindByDomain.mockRejectedValue(new Error('NOT_FOUND'));

        await expect(getAuthedPayloadCtx('acme.example.com')).rejects.toThrow('NEXT_NOT_FOUND');
        expect(mockNotFound).toHaveBeenCalled();
    });

    it('calls notFound() when tenant document is missing for the resolved shop', async () => {
        mockAuth.mockResolvedValue(SESSION);
        mockGetPayload.mockResolvedValue(makePayload({ tenantDocs: [] }));
        mockFindByDomain.mockResolvedValue(SHOP);

        await expect(getAuthedPayloadCtx('acme.example.com')).rejects.toThrow('NEXT_NOT_FOUND');
        expect(mockNotFound).toHaveBeenCalled();
    });

    it('returns full ctx on the happy path', async () => {
        mockAuth.mockResolvedValue(SESSION);
        mockGetPayload.mockResolvedValue(makePayload());
        mockFindByDomain.mockResolvedValue(SHOP);

        const ctx = await getAuthedPayloadCtx('acme.example.com');

        expect(ctx.session).toMatchObject(SESSION);
        expect(ctx.user).toEqual({
            id: String(USER_DOC.id),
            email: USER_DOC.email,
            role: 'admin',
            tenants: [{ tenant: String(TENANT_DOC.id) }],
            collection: 'users',
        });
        expect(ctx.tenant).toEqual({
            id: String(TENANT_DOC.id),
            slug: String(TENANT_DOC.slug),
            name: String(TENANT_DOC.name),
        });
        expect(ctx.payload).toBeDefined();
    });

    it('returns ctx with tenant: null when domain is omitted (cross-tenant admin case)', async () => {
        mockAuth.mockResolvedValue(SESSION);
        mockGetPayload.mockResolvedValue(makePayload());

        const ctx = await getAuthedPayloadCtx();

        expect(ctx.tenant).toBeNull();
        expect(ctx.user.tenants).toEqual([]);
        expect(mockFindByDomain).not.toHaveBeenCalled();
    });
});
