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
});
