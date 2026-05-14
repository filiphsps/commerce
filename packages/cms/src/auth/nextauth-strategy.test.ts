import { hkdf } from '@panva/hkdf';
import { EncryptJWT } from 'jose';
import { describe, expect, it, vi } from 'vitest';
import { buildNextAuthStrategy, computeRolesFromShopMembership } from './nextauth-strategy';

const SECRET = 'test-nextauth-secret';
const COOKIE_NAME = 'next-auth.session-token';

const deriveKey = async (secret: string, salt: string): Promise<Uint8Array> =>
    hkdf('sha256', secret, salt, `Auth.js Generated Encryption Key (${salt})`, 64);

const encryptToken = async (
    payload: Record<string, unknown>,
    options: { secret?: string; salt?: string; exp?: string | number } = {},
): Promise<string> => {
    const secret = options.secret ?? SECRET;
    const salt = options.salt ?? COOKIE_NAME;
    const key = await deriveKey(secret, salt);
    let jwt = new EncryptJWT(payload).setProtectedHeader({ alg: 'dir', enc: 'A256CBC-HS512' });
    if (options.exp === undefined) jwt = jwt.setExpirationTime('1h');
    else if (options.exp !== null) jwt = jwt.setExpirationTime(options.exp);
    return jwt.encrypt(key);
};

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

    it('returns the Payload user matching the JWE email claim', async () => {
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
            secret: SECRET,
            cookieName: COOKIE_NAME,
            findOrCreateUser: findOrCreate,
            recomputeRoles,
        });

        const token = await encryptToken({ email: 'editor@example.com', sub: 'nx_1' });
        const result = await strategy.authenticate(ctx(`${COOKIE_NAME}=${token}`));

        expect(result.user).toMatchObject({ email: 'editor@example.com' });
        expect(findOrCreate).toHaveBeenCalledWith('editor@example.com');
        expect(recomputeRoles).toHaveBeenCalledWith('editor@example.com');
    });

    it('returns { user: null } when no cookie present', async () => {
        const strategy = buildNextAuthStrategy({
            secret: SECRET,
            cookieName: COOKIE_NAME,
            findOrCreateUser: vi.fn(),
            recomputeRoles: vi.fn(),
        });
        const result = await strategy.authenticate(ctx(null));
        expect(result.user).toBeNull();
    });

    it('returns { user: null } when JWE is malformed', async () => {
        const strategy = buildNextAuthStrategy({
            secret: SECRET,
            cookieName: COOKIE_NAME,
            findOrCreateUser: vi.fn(),
            recomputeRoles: vi.fn(),
        });
        const result = await strategy.authenticate(ctx(`${COOKIE_NAME}=garbage`));
        expect(result.user).toBeNull();
    });

    it('returns { user: null } when the named cookie is missing among others', async () => {
        const strategy = buildNextAuthStrategy({
            secret: SECRET,
            cookieName: COOKIE_NAME,
            findOrCreateUser: vi.fn(),
            recomputeRoles: vi.fn(),
        });
        const result = await strategy.authenticate(ctx('foo=bar; baz=qux'));
        expect(result.user).toBeNull();
    });

    it('returns { user: null } when JWE is encrypted with a different secret', async () => {
        const findOrCreate = vi.fn();
        const forged = await encryptToken(
            { email: 'attacker@example.com' },
            { secret: 'a-different-secret-entirely' },
        );
        const strategy = buildNextAuthStrategy({
            secret: SECRET,
            cookieName: COOKIE_NAME,
            findOrCreateUser: findOrCreate as never,
            recomputeRoles: vi.fn() as never,
        });
        const result = await strategy.authenticate(ctx(`${COOKIE_NAME}=${forged}`));
        expect(result.user).toBeNull();
        expect(findOrCreate).not.toHaveBeenCalled();
    });

    it('returns { user: null } when JWE was salted with a different cookie name', async () => {
        // Auth.js salts the HKDF derivation with the cookie name. A token
        // minted for one cookie name cannot be decrypted with the other.
        const findOrCreate = vi.fn();
        const token = await encryptToken(
            { email: 'someone@example.com' },
            { salt: '__Secure-next-auth.session-token' },
        );
        const strategy = buildNextAuthStrategy({
            secret: SECRET,
            cookieName: COOKIE_NAME,
            findOrCreateUser: findOrCreate as never,
            recomputeRoles: vi.fn() as never,
        });
        const result = await strategy.authenticate(ctx(`${COOKIE_NAME}=${token}`));
        expect(result.user).toBeNull();
        expect(findOrCreate).not.toHaveBeenCalled();
    });

    it('returns { user: null } when JWE is expired (beyond clockTolerance)', async () => {
        const findOrCreate = vi.fn();
        // exp 60s in the past — clockTolerance is 15s, so this is expired.
        const expired = await encryptToken(
            { email: 'someone@example.com' },
            { exp: Math.floor(Date.now() / 1000) - 60 },
        );
        const strategy = buildNextAuthStrategy({
            secret: SECRET,
            cookieName: COOKIE_NAME,
            findOrCreateUser: findOrCreate as never,
            recomputeRoles: vi.fn() as never,
        });
        const result = await strategy.authenticate(ctx(`${COOKIE_NAME}=${expired}`));
        expect(result.user).toBeNull();
        expect(findOrCreate).not.toHaveBeenCalled();
    });

    it('returns { user: null } when JWE has no email claim', async () => {
        const findOrCreate = vi.fn();
        const noEmail = await encryptToken({ sub: 'user-1' });
        const strategy = buildNextAuthStrategy({
            secret: SECRET,
            cookieName: COOKIE_NAME,
            findOrCreateUser: findOrCreate as never,
            recomputeRoles: vi.fn() as never,
        });
        const result = await strategy.authenticate(ctx(`${COOKIE_NAME}=${noEmail}`));
        expect(result.user).toBeNull();
        expect(findOrCreate).not.toHaveBeenCalled();
    });

    it('returns { user: null } when JWE email claim is non-string', async () => {
        const findOrCreate = vi.fn();
        const t = await encryptToken({ email: 123 as never });
        const strategy = buildNextAuthStrategy({
            secret: SECRET,
            cookieName: COOKIE_NAME,
            findOrCreateUser: findOrCreate as never,
            recomputeRoles: vi.fn() as never,
        });
        const result = await strategy.authenticate(ctx(`${COOKIE_NAME}=${t}`));
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
            secret: SECRET,
            cookieName: COOKIE_NAME,
            findOrCreateUser: findOrCreate,
            recomputeRoles,
        });
        const token = await encryptToken({ email: 'op@nordcom.io' });
        const result = await strategy.authenticate(ctx(`${COOKIE_NAME}=${token}`));
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
            secret: SECRET,
            cookieName: COOKIE_NAME,
            findOrCreateUser: findOrCreate,
            recomputeRoles: vi.fn(async () => ({ role: 'editor' as const, tenants: [] })),
        });
        const token = await encryptToken({ email: 'a@b.com' });
        const result = await strategy.authenticate(ctx(`${COOKIE_NAME}=${token}`));
        expect((result.user as { collection?: string } | null)?.collection).toBe('users');
    });

    it('returns { user: null } when findOrCreateUser throws', async () => {
        const failing = vi.fn(async () => {
            throw new Error('db down');
        });
        const token = await encryptToken({ email: 'x@y.com' });
        const strategy = buildNextAuthStrategy({
            secret: SECRET,
            cookieName: COOKIE_NAME,
            findOrCreateUser: failing as never,
            recomputeRoles: vi.fn() as never,
        });
        const result = await strategy.authenticate(ctx(`${COOKIE_NAME}=${token}`));
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
            secret: SECRET,
            cookieName: COOKIE_NAME,
            findOrCreateUser: findOrCreate,
            recomputeRoles: vi.fn(async () => ({ role: 'editor' as const, tenants: [] })),
        });
        const token = await encryptToken({ email: 'a@b.com' });
        const result = await strategy.authenticate(
            ctx(`${COOKIE_NAME}=${encodeURIComponent(token)}`),
        );
        expect(result.user).not.toBeNull();
    });

    it('caches the resolved user per token within the TTL window', async () => {
        // The Payload admin UI fires ~10+ concurrent authenticated requests
        // per page load. Each one used to hit Mongo twice (findOrCreateUser
        // + recomputeRoles via findShopsForUser); cache collapses the burst.
        const findOrCreate = vi.fn(async (email: string) => ({
            id: 'u-cache',
            email,
            role: 'editor' as const,
            tenants: [],
        }));
        const recomputeRoles = vi.fn(async () => ({ role: 'editor' as const, tenants: [{ tenant: 't1' }] }));
        const strategy = buildNextAuthStrategy({
            secret: SECRET,
            cookieName: COOKIE_NAME,
            findOrCreateUser: findOrCreate,
            recomputeRoles,
        });
        // Use a unique email so the cache key is unique to this test (the
        // strategy cache is module-scoped and persists across `it` blocks).
        const token = await encryptToken({ email: `cache-${Date.now()}@example.com` });
        const cookie = `${COOKIE_NAME}=${token}`;

        const r1 = await strategy.authenticate(ctx(cookie));
        const r2 = await strategy.authenticate(ctx(cookie));
        const r3 = await strategy.authenticate(ctx(cookie));

        expect(r1.user).not.toBeNull();
        expect(r2.user).not.toBeNull();
        expect(r3.user).not.toBeNull();
        // Only the first request should have hit the underlying lookups.
        expect(findOrCreate).toHaveBeenCalledTimes(1);
        expect(recomputeRoles).toHaveBeenCalledTimes(1);
    });

    it('accepts an array of cookie names and tries each in order', async () => {
        // Use case: deploy that switches from legacy `next-auth.session-token`
        // (NextAuth v4 naming) to Auth.js v5's canonical `authjs.session-token`
        // without bouncing logged-in users to login. The bridge should accept
        // a token written under EITHER name as long as the HKDF salt matches.
        const findOrCreate = vi.fn(async (email: string) => ({
            id: 'u-multi',
            email,
            role: 'editor' as const,
            tenants: [],
        }));
        const recomputeRoles = vi.fn(async () => ({ role: 'editor' as const, tenants: [] }));
        const strategy = buildNextAuthStrategy({
            secret: SECRET,
            // Prefer the new name, fall back to the legacy name.
            cookieName: ['authjs.session-token', 'next-auth.session-token'],
            findOrCreateUser: findOrCreate,
            recomputeRoles,
        });

        // Token written under the LEGACY name (HKDF salt = 'next-auth.session-token').
        const legacyToken = await encryptToken(
            { email: `legacy-${Date.now()}@example.com` },
            { salt: 'next-auth.session-token' },
        );
        const result = await strategy.authenticate(ctx(`next-auth.session-token=${legacyToken}`));
        expect(result.user).not.toBeNull();
        expect(findOrCreate).toHaveBeenCalled();
    });

    it('rejects when none of the candidate cookie names match', async () => {
        const findOrCreate = vi.fn();
        const strategy = buildNextAuthStrategy({
            secret: SECRET,
            cookieName: ['authjs.session-token', 'next-auth.session-token'],
            findOrCreateUser: findOrCreate as never,
            recomputeRoles: vi.fn() as never,
        });
        const token = await encryptToken({ email: 'x@y.com' }, { salt: 'wrong-cookie-name' });
        // Token is present under a name we DON'T accept.
        const result = await strategy.authenticate(ctx(`wrong-cookie-name=${token}`));
        expect(result.user).toBeNull();
        expect(findOrCreate).not.toHaveBeenCalled();
    });

    it('throws when the cookieName array is empty', () => {
        expect(() =>
            buildNextAuthStrategy({
                secret: SECRET,
                cookieName: [],
                findOrCreateUser: vi.fn() as never,
                recomputeRoles: vi.fn() as never,
            }),
        ).toThrow(/at least one name/);
    });
});
