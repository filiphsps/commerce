import { generateKeyPairSync } from 'node:crypto';
import { NotFoundError } from '@nordcom/commerce-errors';
import { createLocalJWKSet, jwtVerify } from 'jose';
import type { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getConvexAuthJwks } from '@/utils/convex-token';

const seam = vi.hoisted(() => ({
    findByDomain: vi.fn(),
    getAuthSession: vi.fn(),
}));

vi.mock('@/api/_loaders', () => ({
    Shop: { findByDomain: seam.findByDomain },
}));

vi.mock('@/auth', () => ({
    getAuthSession: seam.getAuthSession,
}));

import { GET, POST } from './route';

const ISSUER = 'https://storefront.test.nordcom.io';
const AUDIENCE = 'convex-storefront';
const PEM = generateKeyPairSync('rsa', { modulusLength: 2048 })
    .privateKey.export({ type: 'pkcs8', format: 'pem' })
    .toString();

/** The request argument is unused by the handlers (the session comes from cookies via NextAuth). */
const REQUEST = {} as NextRequest;

/**
 * Builds the route context for the tenant-rewritten path.
 *
 * @param domain - The shop domain segment.
 * @returns The `{ params }` context the handler receives.
 */
function routeContext(domain = 'shop.example.com') {
    return { params: Promise.resolve({ domain }) };
}

/**
 * Configures the seams for the happy path: a resolvable shop and an authenticated session.
 *
 * @param user - The session user slice, or `null` for an unauthenticated request.
 */
function arrange(user: { id?: string; name?: string; email?: string; image?: string } | null) {
    seam.findByDomain.mockResolvedValue({ id: 'shop-1', domain: 'shop.example.com' });
    seam.getAuthSession.mockResolvedValue(user ? { user, expires: '2099-01-01T00:00:00.000Z' } : null);
}

/** Stubs the full RS256 signing configuration into the ambient env the route mints from. */
function stubSigningEnv() {
    vi.stubEnv('CONVEX_AUTH_PRIVATE_KEY', PEM);
    vi.stubEnv('CONVEX_AUTH_ISSUER', ISSUER);
    vi.stubEnv('CONVEX_AUTH_APPLICATION_ID', AUDIENCE);
}

afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
});

describe('GET /api/auth/convex-token', () => {
    it('returns 401 with no-store when there is no authenticated customer session', async () => {
        stubSigningEnv();
        arrange(null);

        const response = await GET(REQUEST, routeContext());

        expect(response.status).toBe(401);
        expect(response.headers.get('cache-control')).toBe('no-store');
    });

    it('returns 401 when the session carries no email to mint for', async () => {
        stubSigningEnv();
        arrange({ id: 'customer-1', name: 'Jane' });

        expect((await GET(REQUEST, routeContext())).status).toBe(401);
    });

    it('mints a verifiable RS256 JWT with the session identity as claims', async () => {
        stubSigningEnv();
        arrange({
            id: 'customer-1',
            name: 'Jane Customer',
            email: 'jane@example.com',
            image: 'https://cdn.example.com/jane.png',
        });

        const response = await GET(REQUEST, routeContext());

        expect(response.status).toBe(200);
        expect(response.headers.get('cache-control')).toBe('no-store');
        expect(response.headers.get('content-type')).toContain('text/plain');

        const token = (await response.text()).trim();
        const jwks = await getConvexAuthJwks();
        expect(jwks).not.toBeNull();
        if (!jwks) return;

        const { payload } = await jwtVerify(token, createLocalJWKSet(jwks), { issuer: ISSUER, audience: AUDIENCE });
        expect(payload.sub).toBe('customer-1');
        expect(payload.email).toBe('jane@example.com');
        expect(payload.name).toBe('Jane Customer');
    });

    it('returns 503 when token minting is unconfigured, so the fetcher degrades instead of retrying forever', async () => {
        arrange({ email: 'jane@example.com' });

        expect((await GET(REQUEST, routeContext())).status).toBe(503);
    });

    it('returns 404 for an unknown shop', async () => {
        stubSigningEnv();
        seam.findByDomain.mockRejectedValue(new NotFoundError());

        expect((await GET(REQUEST, routeContext('nope.example.com'))).status).toBe(404);
    });

    it('returns 503 with Retry-After on an infra failure resolving the session', async () => {
        stubSigningEnv();
        seam.findByDomain.mockRejectedValue(new TypeError('upstream timeout'));

        const response = await GET(REQUEST, routeContext());

        expect(response.status).toBe(503);
        expect(response.headers.get('retry-after')).toBe('15');
    });
});

describe('POST /api/auth/convex-token', () => {
    it('mirrors GET for non-idempotent mint clients', async () => {
        stubSigningEnv();
        arrange({ id: 'customer-1', email: 'jane@example.com' });

        const response = await POST(REQUEST, routeContext());

        expect(response.status).toBe(200);
        expect((await response.text()).split('.')).toHaveLength(3);
    });
});
