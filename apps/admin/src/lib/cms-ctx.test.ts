import { beforeEach, describe, expect, it, vi } from 'vitest';

// ------------------------------------------------------------------
// Hoisted mock fns
// ------------------------------------------------------------------

const { mockAuth, mockFindByDomain, mockFindByCollaborator, mockUserFind, mockSetActiveShopSelection } = vi.hoisted(
    () => ({
        mockAuth: vi.fn(),
        mockFindByDomain: vi.fn(),
        mockFindByCollaborator: vi.fn(),
        mockUserFind: vi.fn(),
        mockSetActiveShopSelection: vi.fn(),
    }),
);

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

vi.mock('./active-shop', () => ({ setActiveShopSelection: mockSetActiveShopSelection }));

vi.mock('@nordcom/commerce-db', () => ({
    Shop: { findByDomain: mockFindByDomain, findByCollaborator: mockFindByCollaborator },
    User: { find: mockUserFind },
}));

// Inline isNotFound shim — matches the existing admin-test convention
// (see [domain]/page.test.tsx). If the real `Error.isNotFound` ever changes
// its detection (different property, custom class), this would diverge
// silently, but consistency with the rest of the admin suite wins here.
vi.mock('@nordcom/commerce-errors', () => ({
    Error: { isNotFound: (e: unknown) => e instanceof globalThis.Error && e.message === 'NOT_FOUND' },
}));

// ------------------------------------------------------------------
// Import SUT after all mocks are registered
// ------------------------------------------------------------------

import { getAuthedCmsCtx } from './cms-ctx';

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

const SHOP_DOMAIN = 'acme.example.com';
const SESSION = { user: { email: 'admin@example.com', id: 'u1' }, expires: '2099-01-01' };

const USER_DOC = { id: 'user-doc-1', email: 'admin@example.com' };

// Post-cutover the tenant IS the shop document, resolved by domain through the
// Convex-backed `Shop.findByDomain`; role + membership derive from the
// `shopCollaborators` join `Shop.findByCollaborator` returns.
const SHOP_DOC = { id: 'shop-1', domain: SHOP_DOMAIN, name: 'Acme Store', i18n: { defaultLocale: 'en-US' } };

/**
 * Builds one collaborated-shop row in the `findByCollaborator` payload shape.
 *
 * @param shopId - The collaborated shop's id.
 * @param permissions - The collaborator row's permission strings.
 * @returns The collaborated shop carrying the join row for {@link USER_DOC}.
 */
function collaboration(shopId: string, permissions: string[]) {
    return { id: shopId, domain: SHOP_DOMAIN, collaborators: [{ user: USER_DOC.id, permissions }] };
}

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe('getAuthedCmsCtx', () => {
    beforeEach(() => {
        mockAuth.mockReset();
        mockFindByDomain.mockReset();
        mockFindByCollaborator.mockReset();
        mockUserFind.mockReset();
        mockSetActiveShopSelection.mockReset();

        mockAuth.mockResolvedValue(SESSION);
        mockUserFind.mockResolvedValue(USER_DOC);
        mockFindByCollaborator.mockResolvedValue([collaboration(SHOP_DOC.id, ['admin'])]);
        mockFindByDomain.mockResolvedValue(SHOP_DOC);
    });

    it('redirects unauthenticated — auth() returns null', async () => {
        mockAuth.mockResolvedValue(null);

        await expect(getAuthedCmsCtx(SHOP_DOMAIN)).rejects.toThrow('NEXT_REDIRECT:/auth/login/');
    });

    it('redirects unauthenticated — session has no email', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'u1' }, expires: '2099-01-01' });

        await expect(getAuthedCmsCtx(SHOP_DOMAIN)).rejects.toThrow('NEXT_REDIRECT:/auth/login/');
    });

    it('redirects to login when no platform user exists for the session email', async () => {
        // The single-result `User.find({ count: 1 })` overload throws a
        // NotFoundError when no row matches — the redirect must absorb it.
        mockUserFind.mockRejectedValue(new Error('NOT_FOUND'));

        await expect(getAuthedCmsCtx(SHOP_DOMAIN)).rejects.toThrow('NEXT_REDIRECT:/auth/login/');
    });

    it('calls notFound() when Shop.findByDomain throws a NotFoundError', async () => {
        mockFindByDomain.mockRejectedValue(new Error('NOT_FOUND'));

        await expect(getAuthedCmsCtx(SHOP_DOMAIN)).rejects.toThrow('NEXT_NOT_FOUND');
        expect(mockFindByDomain).toHaveBeenCalledWith(SHOP_DOMAIN);
    });

    it('returns full ctx on the happy path', async () => {
        const ctx = await getAuthedCmsCtx(SHOP_DOMAIN);

        expect(ctx.session).toMatchObject(SESSION);
        expect(ctx.user).toEqual({
            id: USER_DOC.id,
            email: USER_DOC.email,
            role: 'admin',
            tenants: [{ tenant: SHOP_DOC.id }],
            collection: 'users',
        });
        expect(ctx.tenant).toEqual({
            id: SHOP_DOC.id,
            slug: SHOP_DOC.id,
            name: SHOP_DOC.name,
            defaultLocale: 'en-US',
            locales: ['en-US'],
        });
        expect(mockFindByDomain).toHaveBeenCalledWith(SHOP_DOMAIN);
        expect(mockUserFind).toHaveBeenCalledWith({ filter: { email: USER_DOC.email }, count: 1 });
        expect(mockFindByCollaborator).toHaveBeenCalledWith({ collaboratorId: USER_DOC.id });
    });

    it('narrows role to "editor" when no collaboration carries the admin permission', async () => {
        mockFindByCollaborator.mockResolvedValue([collaboration(SHOP_DOC.id, ['editor'])]);

        const ctx = await getAuthedCmsCtx(SHOP_DOMAIN);

        expect(ctx.user.role).toBe('editor');
    });

    it('falls back to domain for name when the shop doc omits it', async () => {
        mockFindByDomain.mockResolvedValue({ ...SHOP_DOC, name: undefined });

        const ctx = await getAuthedCmsCtx(SHOP_DOMAIN);

        expect(ctx.tenant?.name).toBe(SHOP_DOMAIN);
        expect(ctx.tenant?.slug).toBe(SHOP_DOC.id);
    });

    it('returns ctx with tenant: null when domain is omitted (cross-tenant admin case)', async () => {
        const ctx = await getAuthedCmsCtx();

        expect(ctx.tenant).toBeNull();
        // The tenants list still reflects the user's real collaborations.
        expect(ctx.user.tenants).toEqual([{ tenant: SHOP_DOC.id }]);
        expect(mockFindByDomain).not.toHaveBeenCalled();
        // Cross-tenant routes mint claim-less tokens: no selection may linger for the request.
        expect(mockSetActiveShopSelection).toHaveBeenCalledWith(undefined);
    });

    it('records the resolved tenant as the request active-shop selection (POLISH-03 mint seam)', async () => {
        await getAuthedCmsCtx(SHOP_DOMAIN);

        // `tenant.id` is the shop's external id (`shops.legacyId`) — exactly the selector the
        // Convex resolver matches the token's active-shop claim against.
        expect(mockSetActiveShopSelection).toHaveBeenCalledWith(SHOP_DOC.id);
    });

    // Cross-tenant write bypass prevention. See the comment block above
    // the tenant-membership gate in cms-ctx.ts for the full rationale.
    it('calls notFound() when an editor lacks a collaboration on the resolved tenant', async () => {
        mockFindByCollaborator.mockResolvedValue([collaboration('shop-OTHER', ['editor'])]);

        await expect(getAuthedCmsCtx(SHOP_DOMAIN)).rejects.toThrow('NEXT_NOT_FOUND');
    });

    it('returns ctx normally when an editor collaborates on the resolved tenant', async () => {
        mockFindByCollaborator.mockResolvedValue([collaboration(SHOP_DOC.id, ['editor'])]);

        const ctx = await getAuthedCmsCtx(SHOP_DOMAIN);

        expect(ctx.user.role).toBe('editor');
        expect(ctx.tenant?.id).toBe(SHOP_DOC.id);
    });

    it('returns ctx for admins regardless of membership on the resolved tenant (admins are not gated)', async () => {
        // Admin via a DIFFERENT shop's collaboration — still granted access,
        // matching `tenantMember`'s early-return-true branch for the admin role.
        mockFindByCollaborator.mockResolvedValue([collaboration('shop-OTHER', ['admin'])]);

        const ctx = await getAuthedCmsCtx(SHOP_DOMAIN);

        expect(ctx.user.role).toBe('admin');
        expect(ctx.tenant?.id).toBe(SHOP_DOC.id);
    });

    it('projects tenant.defaultLocale from the shop doc i18n and derives locales from it', async () => {
        mockFindByDomain.mockResolvedValue({ ...SHOP_DOC, i18n: { defaultLocale: 'de' } });

        const ctx = await getAuthedCmsCtx(SHOP_DOMAIN);

        expect(ctx.tenant?.defaultLocale).toBe('de');
        expect(ctx.tenant?.locales).toEqual(['de']);
    });

    it('falls back tenant.defaultLocale to "en-US" when the shop doc omits i18n', async () => {
        mockFindByDomain.mockResolvedValue({ id: SHOP_DOC.id, domain: SHOP_DOMAIN, name: 'Acme Store' });

        const ctx = await getAuthedCmsCtx(SHOP_DOMAIN);

        expect(ctx.tenant?.defaultLocale).toBe('en-US');
        expect(ctx.tenant?.locales).toEqual(['en-US']);
    });
});
