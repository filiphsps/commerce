import { beforeEach, describe, expect, it, vi } from 'vitest';

// ------------------------------------------------------------------
// Hoisted mock fns
// ------------------------------------------------------------------

const { mockAuth, mockFindByDomain, mockGetPayload } = vi.hoisted(() => ({
    mockAuth: vi.fn(),
    mockFindByDomain: vi.fn(),
    mockGetPayload: vi.fn(),
}));

// ------------------------------------------------------------------
// Mocks
// ------------------------------------------------------------------

vi.mock('server-only', () => ({}));

// `redirect` and `notFound` are defined inline (rather than as resettable
// `vi.fn()` instances) so a future cleanup pass can't silently normalise them
// to no-op `mockReset()`s and break every assertion in this file. The trade-off
// is that we can't `toHaveBeenCalledWith` on them — instead, every test
// asserts on the sentinel error string they throw, which is strictly stronger
// (it proves the helper called the right function with the right path AND
// halted execution at that point).
vi.mock('next/navigation', () => ({
    redirect: (url: string): never => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    },
    notFound: (): never => {
        throw new Error('NEXT_NOT_FOUND');
    },
}));

vi.mock('@/auth', () => ({ auth: mockAuth }));

vi.mock('@nordcom/commerce-db', () => ({
    Shop: { findByDomain: mockFindByDomain },
}));

// Inline isNotFound shim — matches the existing admin-test convention
// (see [domain]/page.test.tsx). If the real `Error.isNotFound` ever changes
// its detection (different property, custom class), this would diverge
// silently, but consistency with the rest of the admin suite wins here.
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

const SHOP_DOMAIN = 'acme.example.com';
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

const SHOP = { id: 'shop-1', domain: SHOP_DOMAIN };

function makePayload(overrides?: { userDocs?: unknown[]; tenantDocs?: unknown[] }): { find: ReturnType<typeof vi.fn> } {
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
    });

    it('redirects unauthenticated — auth() returns null', async () => {
        mockAuth.mockResolvedValue(null);

        await expect(getAuthedPayloadCtx(SHOP_DOMAIN)).rejects.toThrow('NEXT_REDIRECT:/auth/login/');
    });

    it('redirects unauthenticated — session has no email', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'u1' }, expires: '2099-01-01' });

        await expect(getAuthedPayloadCtx(SHOP_DOMAIN)).rejects.toThrow('NEXT_REDIRECT:/auth/login/');
    });

    it('redirects to login when Payload user does not exist', async () => {
        mockAuth.mockResolvedValue(SESSION);
        mockGetPayload.mockResolvedValue(makePayload({ userDocs: [] }));

        await expect(getAuthedPayloadCtx(SHOP_DOMAIN)).rejects.toThrow('NEXT_REDIRECT:/auth/login/');
    });

    it('calls notFound() when Shop.findByDomain throws a NotFoundError', async () => {
        mockAuth.mockResolvedValue(SESSION);
        mockGetPayload.mockResolvedValue(makePayload());
        mockFindByDomain.mockRejectedValue(new Error('NOT_FOUND'));

        await expect(getAuthedPayloadCtx(SHOP_DOMAIN)).rejects.toThrow('NEXT_NOT_FOUND');
        expect(mockFindByDomain).toHaveBeenCalledWith(SHOP_DOMAIN);
    });

    it('calls notFound() when tenant document is missing for the resolved shop', async () => {
        mockAuth.mockResolvedValue(SESSION);
        mockGetPayload.mockResolvedValue(makePayload({ tenantDocs: [] }));
        mockFindByDomain.mockResolvedValue(SHOP);

        await expect(getAuthedPayloadCtx(SHOP_DOMAIN)).rejects.toThrow('NEXT_NOT_FOUND');
    });

    it('returns full ctx on the happy path', async () => {
        mockAuth.mockResolvedValue(SESSION);
        const payload = makePayload();
        mockGetPayload.mockResolvedValue(payload);
        mockFindByDomain.mockResolvedValue(SHOP);

        const ctx = await getAuthedPayloadCtx(SHOP_DOMAIN);

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
        expect(ctx.payload).toBe(payload);
        expect(mockFindByDomain).toHaveBeenCalledWith(SHOP_DOMAIN);
        // Auth gate — both find() calls MUST set overrideAccess: true. Without
        // it Payload's access predicates run against the un-resolved user
        // context (no `tenants` yet) and would refuse to read the very
        // documents we need to build that context. Silent regression here
        // would render every authed route as Unauthorized.
        expect(payload.find).toHaveBeenCalledWith(
            expect.objectContaining({ collection: 'users', overrideAccess: true }),
        );
        expect(payload.find).toHaveBeenCalledWith(
            expect.objectContaining({ collection: 'tenants', overrideAccess: true }),
        );
    });

    it('narrows role to "editor" when userDoc.role is not "admin"', async () => {
        mockAuth.mockResolvedValue(SESSION);
        // Editor must be a member of the resolved tenant — otherwise the
        // tenant-membership gate below correctly fires notFound() and this
        // test would assert on a code path that never returns.
        mockGetPayload.mockResolvedValue(
            makePayload({
                userDocs: [{ ...USER_DOC, role: 'editor', tenants: [{ tenant: TENANT_DOC.id }] }],
            }),
        );
        mockFindByDomain.mockResolvedValue(SHOP);

        const ctx = await getAuthedPayloadCtx(SHOP_DOMAIN);

        expect(ctx.user.role).toBe('editor');
    });

    it('falls back to shop.id for slug and domain for name when tenant doc omits them', async () => {
        mockAuth.mockResolvedValue(SESSION);
        mockGetPayload.mockResolvedValue(
            makePayload({ tenantDocs: [{ id: TENANT_DOC.id, slug: undefined, name: undefined }] }),
        );
        mockFindByDomain.mockResolvedValue(SHOP);

        const ctx = await getAuthedPayloadCtx(SHOP_DOMAIN);

        expect(ctx.tenant).toEqual({
            id: String(TENANT_DOC.id),
            slug: SHOP.id,
            name: SHOP_DOMAIN,
        });
    });

    it('returns ctx with tenant: null when domain is omitted (cross-tenant admin case)', async () => {
        mockAuth.mockResolvedValue(SESSION);
        mockGetPayload.mockResolvedValue(makePayload());

        const ctx = await getAuthedPayloadCtx();

        expect(ctx.tenant).toBeNull();
        expect(ctx.user.tenants).toEqual([]);
        expect(mockFindByDomain).not.toHaveBeenCalled();
    });

    // Cross-tenant write bypass prevention. See the comment block above
    // the tenant-membership gate in payload-ctx.ts for the full rationale.
    it('calls notFound() when an editor lacks membership in the resolved tenant', async () => {
        mockAuth.mockResolvedValue(SESSION);
        mockGetPayload.mockResolvedValue(
            makePayload({
                userDocs: [
                    {
                        ...USER_DOC,
                        role: 'editor',
                        // Editor belongs to a different tenant — must NOT
                        // be granted access to the one resolved from the
                        // current domain.
                        tenants: [{ tenant: 'tenant-doc-OTHER' }],
                    },
                ],
            }),
        );
        mockFindByDomain.mockResolvedValue(SHOP);

        await expect(getAuthedPayloadCtx(SHOP_DOMAIN)).rejects.toThrow('NEXT_NOT_FOUND');
    });

    it('returns ctx normally when an editor is a member of the resolved tenant', async () => {
        mockAuth.mockResolvedValue(SESSION);
        mockGetPayload.mockResolvedValue(
            makePayload({
                userDocs: [
                    {
                        ...USER_DOC,
                        role: 'editor',
                        tenants: [{ tenant: TENANT_DOC.id }],
                    },
                ],
            }),
        );
        mockFindByDomain.mockResolvedValue(SHOP);

        const ctx = await getAuthedPayloadCtx(SHOP_DOMAIN);

        expect(ctx.user.role).toBe('editor');
        expect(ctx.tenant?.id).toBe(String(TENANT_DOC.id));
    });

    it('returns ctx for admins regardless of their tenants list (admins are not gated)', async () => {
        mockAuth.mockResolvedValue(SESSION);
        mockGetPayload.mockResolvedValue(
            makePayload({
                userDocs: [
                    {
                        ...USER_DOC,
                        role: 'admin',
                        // Admin happens to have no membership records at
                        // all — must still be granted full access since
                        // `tenantScopedWrite` short-circuits on role.
                        tenants: [],
                    },
                ],
            }),
        );
        mockFindByDomain.mockResolvedValue(SHOP);

        const ctx = await getAuthedPayloadCtx(SHOP_DOMAIN);

        expect(ctx.user.role).toBe('admin');
        expect(ctx.tenant?.id).toBe(String(TENANT_DOC.id));
    });
});
