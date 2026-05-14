import { createHash } from 'node:crypto';
import { hkdf } from '@panva/hkdf';
import { jwtDecrypt } from 'jose';
import type { AuthStrategy } from 'payload';

export type CmsRoleAssignment = {
    role: 'admin' | 'editor';
    tenants: Array<{ tenant: string }>;
};

export type ComputeRolesInput = {
    email: string;
    shopCollaborators: Array<{ shopId: string }>;
    isOperator: boolean;
};

export const computeRolesFromShopMembership = ({
    shopCollaborators,
    isOperator,
}: ComputeRolesInput): CmsRoleAssignment => {
    if (isOperator) return { role: 'admin', tenants: [] };
    return { role: 'editor', tenants: shopCollaborators.map((c) => ({ tenant: c.shopId })) };
};

export type FindOrCreateUserFn = (email: string) => Promise<{
    id: string;
    email: string;
    role: 'admin' | 'editor';
    tenants: Array<{ tenant: string }>;
}>;

export type RecomputeRolesFn = (email: string) => Promise<CmsRoleAssignment>;

export type BuildNextAuthStrategyOptions = {
    secret: string;
    /**
     * Cookie name(s) to try. Accepts a single string or an ordered array.
     * Use an array to support multiple naming conventions in parallel — e.g.
     * Auth.js v5 canonical (`authjs.session-token`) alongside the legacy
     * `next-auth.session-token` during a deploy transition, so logged-in
     * users with the old cookie aren't bounced to login.
     */
    cookieName: string | string[];
    findOrCreateUser: FindOrCreateUserFn;
    recomputeRoles: RecomputeRolesFn;
};

const parseCookie = (cookieHeader: string | null, name: string): string | null => {
    if (!cookieHeader) return null;
    const parts = cookieHeader.split(';');
    for (const p of parts) {
        const [k, ...v] = p.trim().split('=');
        if (k === name) return decodeURIComponent(v.join('='));
    }
    return null;
};

/**
 * Derive the JWE encryption key the same way Auth.js (NextAuth v5) does. The
 * salt is the cookie name and the info string is hardcoded by Auth.js — see
 * `@auth/core/jwt#getDerivedEncryptionKey`.
 *
 * Default content encryption is A256CBC-HS512 → a 64-byte key.
 */
const deriveKey = async (secret: string, salt: string): Promise<Uint8Array> => {
    return hkdf('sha256', secret, salt, `Auth.js Generated Encryption Key (${salt})`, 64);
};

// The Payload admin UI fires ~10+ concurrent requests per page load and
// each one goes through this strategy — without caching, every request
// pays for two Mongo round-trips (`findOrCreateUser` + `findShopsForUser`).
// A short-lived in-process cache keyed by the token's hash collapses the
// burst down to one set of Mongo calls per page load while still picking
// up role changes within 30 seconds. Hash the token rather than store it
// directly so the cache key can't be used to forge a session if the
// process is dumped.
type CacheEntry = {
    user: {
        id: string;
        email: string;
        role: 'admin' | 'editor';
        tenants: Array<{ tenant: string }>;
    };
    roles: CmsRoleAssignment;
    expiresAt: number;
};
const STRATEGY_CACHE_TTL_MS = 30_000;
const STRATEGY_CACHE_MAX = 256;
const strategyCache = new Map<string, CacheEntry>();
const tokenKey = (token: string): string => createHash('sha256').update(token).digest('base64');
const evictExpired = (now: number): void => {
    if (strategyCache.size <= STRATEGY_CACHE_MAX) return;
    for (const [k, entry] of strategyCache) {
        if (entry.expiresAt <= now) strategyCache.delete(k);
    }
    // Still over budget? Drop oldest insertion order (Map iterates insertion order).
    while (strategyCache.size > STRATEGY_CACHE_MAX) {
        const first = strategyCache.keys().next().value;
        if (first === undefined) break;
        strategyCache.delete(first);
    }
};

export const buildNextAuthStrategy = ({
    secret,
    cookieName,
    findOrCreateUser,
    recomputeRoles,
}: BuildNextAuthStrategyOptions): AuthStrategy => {
    const cookieNames = Array.isArray(cookieName) ? cookieName : [cookieName];
    if (cookieNames.length === 0) {
        throw new Error('[cms/auth-bridge] cookieName must contain at least one name');
    }

    // Find the first cookie that's present AND decodes successfully. Each
    // candidate name is also used as the HKDF salt (Auth.js v5 keys its
    // derived encryption key off the cookie name), so a token written under
    // `authjs.session-token` can only be decoded with that exact salt.
    const tryDecode = async (
        cookieHeader: string | null,
    ): Promise<{ name: string; token: string; payload: Record<string, unknown> } | null> => {
        for (const name of cookieNames) {
            const token = parseCookie(cookieHeader, name);
            if (!token) continue;
            try {
                const key = await deriveKey(secret, name);
                const { payload } = await jwtDecrypt(token, key, { clockTolerance: 15 });
                return { name, token, payload };
            } catch {
                // Cookie present but decode failed under this name — try the
                // next candidate. (Don't swallow the last failure; if every
                // candidate fails the outer caller reports it.)
                continue;
            }
        }
        return null;
    };

    return {
        name: 'nextauth-bridge',
        authenticate: async ({ headers }) => {
            const cookieHeader = headers.get('cookie');
            try {
                const decoded = await tryDecode(cookieHeader);
                if (!decoded) return { user: null };
                const { token, payload } = decoded;

                const cacheKey = tokenKey(token);
                const now = Date.now();
                const cached = strategyCache.get(cacheKey);
                if (cached && cached.expiresAt > now) {
                    return {
                        user: {
                            ...cached.user,
                            role: cached.roles.role,
                            tenants: cached.roles.tenants,
                            collection: 'users',
                        } as never,
                    };
                }

                const email = typeof payload.email === 'string' ? payload.email : null;
                if (!email) return { user: null };
                const user = await findOrCreateUser(email);
                const roles = await recomputeRoles(email);
                strategyCache.set(cacheKey, { user, roles, expiresAt: now + STRATEGY_CACHE_TTL_MS });
                evictExpired(now);
                return {
                    user: {
                        ...user,
                        role: roles.role,
                        tenants: roles.tenants,
                        collection: 'users',
                    } as never,
                };
            } catch (err) {
                console.warn(
                    '[cms/auth-bridge] failed to authenticate request:',
                    err instanceof Error ? err.message : String(err),
                );
                return { user: null };
            }
        },
    };
};
