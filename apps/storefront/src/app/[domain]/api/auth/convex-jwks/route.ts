import { NextResponse } from 'next/server';
import { getConvexAuthJwks } from '@/utils/convex-token';

/**
 * Serves the public JWKS for the storefront's Convex token signing key — the URL
 * `CONVEX_AUTH_JWKS_URL` points the Convex deployment's `customJwt` provider at
 * (`packages/convex/convex/auth.config.ts`). The document is derived on demand from
 * `CONVEX_AUTH_PRIVATE_KEY` (public members only — `kty`/`n`/`e` plus `kid`/`alg`/`use`), so
 * there is no separate public-key env var to drift out of sync.
 *
 * Lives under the tenant segment because the middleware rewrites every `/api/` path to
 * `/[domain]/api/…`; the response is tenant-independent (one platform signing key), which is
 * also why it is safe to cache briefly — Convex re-fetches the JWKS on rotation anyway.
 *
 * @returns `200` with the JWKS JSON, or `404` when no signing key is configured (the
 *   deployment then simply has no key source, which fails closed on the Convex side).
 */
export async function GET(): Promise<NextResponse> {
    const jwks = await getConvexAuthJwks();
    if (!jwks) {
        return NextResponse.json(
            { error: 'no signing key configured' },
            { status: 404, headers: { 'Cache-Control': 'no-store' } },
        );
    }

    return NextResponse.json(jwks, {
        status: 200,
        headers: { 'Cache-Control': 'public, max-age=300, must-revalidate' },
    });
}
