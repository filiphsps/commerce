import { SignJWT } from 'jose';
import { describe, expect, it, vi } from 'vitest';
import { buildNextAuthStrategy, computeRolesFromShopMembership } from './nextauth-strategy';

const secret = new TextEncoder().encode('test-nextauth-secret');

const signToken = async (data: Record<string, unknown>): Promise<string> =>
    new SignJWT(data).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(secret);

describe('computeRolesFromShopMembership', () => {
    it('returns admin role for operator-flagged users', () => {
        const r = computeRolesFromShopMembership({
            email: 'op@nordcom.io',
            shopCollaborators: [],
            isOperator: true,
        });
        expect(r.role).toBe('admin');
        expect(r.tenants).toEqual([]);
    });

    it('returns editor with the right tenant set for non-operators', () => {
        const r = computeRolesFromShopMembership({
            email: 'editor@example.com',
            shopCollaborators: [{ shopId: 't1' }, { shopId: 't2' }],
            isOperator: false,
        });
        expect(r.role).toBe('editor');
        expect(r.tenants.map((t) => t.tenant)).toEqual(['t1', 't2']);
    });

    it('returns editor with no tenants if user is a member of nothing', () => {
        const r = computeRolesFromShopMembership({
            email: 'lonely@example.com',
            shopCollaborators: [],
            isOperator: false,
        });
        expect(r.role).toBe('editor');
        expect(r.tenants).toEqual([]);
    });
});

describe('buildNextAuthStrategy', () => {
    const ctx = (cookieValue: string | null) => {
        const headers = new Headers();
        if (cookieValue) headers.set('cookie', cookieValue);
        return { headers, req: { headers } } as never;
    };

    it('returns the Payload user matching the JWT email', async () => {
        const findOrCreate = vi.fn(async (email: string) => ({
            id: 'u1',
            email,
            role: 'editor' as const,
            tenants: [],
        }));
        const recomputeRoles = vi.fn(async () => ({
            role: 'editor' as const,
            tenants: [{ tenant: 't1' }],
        }));

        const strategy = buildNextAuthStrategy({
            secret: 'test-nextauth-secret',
            cookieName: 'next-auth.session-token',
            findOrCreateUser: findOrCreate,
            recomputeRoles,
        });

        const token = await signToken({ email: 'editor@example.com', sub: 'nx_1' });
        const result = await strategy.authenticate(ctx(`next-auth.session-token=${token}`));

        expect(result.user).toMatchObject({ email: 'editor@example.com' });
        expect(findOrCreate).toHaveBeenCalledWith('editor@example.com');
        expect(recomputeRoles).toHaveBeenCalledWith('editor@example.com');
    });

    it('returns { user: null } when no cookie present', async () => {
        const strategy = buildNextAuthStrategy({
            secret: 'test-nextauth-secret',
            cookieName: 'next-auth.session-token',
            findOrCreateUser: vi.fn(),
            recomputeRoles: vi.fn(),
        });
        const result = await strategy.authenticate(ctx(null));
        expect(result.user).toBeNull();
    });

    it('returns { user: null } when JWT is invalid', async () => {
        const strategy = buildNextAuthStrategy({
            secret: 'test-nextauth-secret',
            cookieName: 'next-auth.session-token',
            findOrCreateUser: vi.fn(),
            recomputeRoles: vi.fn(),
        });
        const result = await strategy.authenticate(ctx('next-auth.session-token=garbage'));
        expect(result.user).toBeNull();
    });

    it('returns { user: null } when the named cookie is missing among others', async () => {
        const strategy = buildNextAuthStrategy({
            secret: 'test-nextauth-secret',
            cookieName: 'next-auth.session-token',
            findOrCreateUser: vi.fn(),
            recomputeRoles: vi.fn(),
        });
        const result = await strategy.authenticate(ctx('foo=bar; baz=qux'));
        expect(result.user).toBeNull();
    });

    it('returns { user: null } when JWT is signed by a different secret', async () => {
        const wrongKey = new TextEncoder().encode('a-different-secret-entirely');
        const forged = await new SignJWT({ email: 'attacker@example.com' })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('5m')
            .sign(wrongKey);
        const findOrCreate = vi.fn();
        const strategy = buildNextAuthStrategy({
            secret: 'test-nextauth-secret',
            cookieName: 'next-auth.session-token',
            findOrCreateUser: findOrCreate as never,
            recomputeRoles: vi.fn() as never,
        });
        const result = await strategy.authenticate(ctx(`next-auth.session-token=${forged}`));
        expect(result.user).toBeNull();
        expect(findOrCreate).not.toHaveBeenCalled();
    });

    it('returns { user: null } when JWT is expired', async () => {
        const expired = await new SignJWT({ email: 'someone@example.com' })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt(0)
            .setExpirationTime(1)
            .sign(secret);
        const findOrCreate = vi.fn();
        const strategy = buildNextAuthStrategy({
            secret: 'test-nextauth-secret',
            cookieName: 'next-auth.session-token',
            findOrCreateUser: findOrCreate as never,
            recomputeRoles: vi.fn() as never,
        });
        const result = await strategy.authenticate(ctx(`next-auth.session-token=${expired}`));
        expect(result.user).toBeNull();
        expect(findOrCreate).not.toHaveBeenCalled();
    });

    it('returns { user: null } when JWT has no email claim', async () => {
        const findOrCreate = vi.fn();
        const noEmail = await signToken({ sub: 'user-1' });
        const strategy = buildNextAuthStrategy({
            secret: 'test-nextauth-secret',
            cookieName: 'next-auth.session-token',
            findOrCreateUser: findOrCreate as never,
            recomputeRoles: vi.fn() as never,
        });
        const result = await strategy.authenticate(ctx(`next-auth.session-token=${noEmail}`));
        expect(result.user).toBeNull();
        expect(findOrCreate).not.toHaveBeenCalled();
    });

    it('returns { user: null } when JWT email claim is non-string', async () => {
        const findOrCreate = vi.fn();
        const t = await signToken({ email: 123 as never });
        const strategy = buildNextAuthStrategy({
            secret: 'test-nextauth-secret',
            cookieName: 'next-auth.session-token',
            findOrCreateUser: findOrCreate as never,
            recomputeRoles: vi.fn() as never,
        });
        const result = await strategy.authenticate(ctx(`next-auth.session-token=${t}`));
        expect(result.user).toBeNull();
    });

    it('escalates to admin when recomputeRoles flips the role', async () => {
        const findOrCreate = vi.fn(async (email: string) => ({
            id: 'u-op',
            email,
            role: 'editor' as const,
            tenants: [],
        }));
        const recomputeRoles = vi.fn(async () => ({ role: 'admin' as const, tenants: [] }));
        const strategy = buildNextAuthStrategy({
            secret: 'test-nextauth-secret',
            cookieName: 'next-auth.session-token',
            findOrCreateUser: findOrCreate,
            recomputeRoles,
        });
        const token = await signToken({ email: 'op@nordcom.io' });
        const result = await strategy.authenticate(ctx(`next-auth.session-token=${token}`));
        expect((result.user as { role?: string } | null)?.role).toBe('admin');
    });

    it('attaches collection: "users" to the resolved user (Payload contract)', async () => {
        const findOrCreate = vi.fn(async (email: string) => ({
            id: 'u1',
            email,
            role: 'editor' as const,
            tenants: [],
        }));
        const strategy = buildNextAuthStrategy({
            secret: 'test-nextauth-secret',
            cookieName: 'next-auth.session-token',
            findOrCreateUser: findOrCreate,
            recomputeRoles: vi.fn(async () => ({ role: 'editor' as const, tenants: [] })),
        });
        const token = await signToken({ email: 'a@b.com' });
        const result = await strategy.authenticate(ctx(`next-auth.session-token=${token}`));
        expect((result.user as { collection?: string } | null)?.collection).toBe('users');
    });

    it('returns { user: null } when findOrCreateUser throws', async () => {
        const failing = vi.fn(async () => {
            throw new Error('db down');
        });
        const token = await signToken({ email: 'x@y.com' });
        const strategy = buildNextAuthStrategy({
            secret: 'test-nextauth-secret',
            cookieName: 'next-auth.session-token',
            findOrCreateUser: failing as never,
            recomputeRoles: vi.fn() as never,
        });
        const result = await strategy.authenticate(ctx(`next-auth.session-token=${token}`));
        expect(result.user).toBeNull();
    });

    it('decodes URL-encoded cookie values', async () => {
        const findOrCreate = vi.fn(async (email: string) => ({
            id: 'u1',
            email,
            role: 'editor' as const,
            tenants: [],
        }));
        const strategy = buildNextAuthStrategy({
            secret: 'test-nextauth-secret',
            cookieName: 'next-auth.session-token',
            findOrCreateUser: findOrCreate,
            recomputeRoles: vi.fn(async () => ({ role: 'editor' as const, tenants: [] })),
        });
        const token = await signToken({ email: 'a@b.com' });
        const result = await strategy.authenticate(
            ctx(`next-auth.session-token=${encodeURIComponent(token)}`),
        );
        expect(result.user).not.toBeNull();
    });
});
