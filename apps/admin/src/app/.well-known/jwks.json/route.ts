import { NextResponse } from 'next/server';

import { getConvexAuthJwks } from '@/lib/convex-token';

/**
 * Serves the public JWKS for the admin's Convex operator-token signing key — the URL the Convex
 * deployment's `customJwt` provider fetches (`CONVEX_AUTH_JWKS_URL`, which defaults to the
 * issuer's `/.well-known/jwks.json`; `packages/convex/convex/auth.config.ts`). Without it Convex
 * cannot fetch the public key, rejects every admin-minted operator token, and every identity-scoped
 * admin read (account settings, the CMS editors) fails closed. The document is derived on demand
 * from `CONVEX_AUTH_PRIVATE_KEY` (public members only), so there is no separate public-key env var
 * to drift out of sync. Mirrors the storefront's `convex-jwks` route.
 *
 * @returns `200` with the JWKS JSON, or `404` when no signing key is configured (the deployment
 *   then simply has no key source, which fails closed on the Convex side).
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
