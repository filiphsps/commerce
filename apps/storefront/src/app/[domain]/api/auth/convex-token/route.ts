import { Error as CommerceError } from '@nordcom/commerce-errors';
import { trace } from '@opentelemetry/api';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { Shop } from '@/api/_loaders';
import { getAuthSession } from '@/auth';
import { mintConvexCustomerToken } from '@/utils/convex-token';

// Identity material: every response is per-customer and must never be cached
// by the edge or the browser. The route is dynamic-by-construction (it reads
// the per-tenant session cookie), so no segment hint is needed under
// `cacheComponents` — same constraint as the sibling `[...nextauth]` route.
const noStoreHeaders = { 'Cache-Control': 'no-store' };

export type ConvexTokenRouteParams = Promise<{ domain: string }>;

/**
 * Exchanges the customer's NextAuth session for a Convex-validatable RS256 JWT — the server
 * counterpart of `convex-auth-fetcher.ts`'s `CONVEX_AUTH_TOKEN_ENDPOINT`. The NextAuth session
 * cookie is an encrypted JWE Convex cannot verify, so the browser's `ConvexReactClient` trades it
 * here (same-origin, cookie-gated) for a token signed with `CONVEX_AUTH_PRIVATE_KEY` that the
 * deployment's `customJwt` provider validates against the published JWKS.
 *
 * @param params - The tenant route params carrying the resolved shop `domain`.
 * @returns `200 text/plain` with the compact JWT; `401` when there is no authenticated customer
 *   (no session, a session without an email, or a shop without customer auth); `404` for an
 *   unknown shop; `503` when minting is unconfigured or the session lookup infra fails.
 */
async function mintTokenForRequest(params: ConvexTokenRouteParams): Promise<NextResponse> {
    const { domain } = await params;

    let session: Awaited<ReturnType<typeof getAuthSession>>;
    try {
        const shop = await Shop.findByDomain(domain, { sensitiveData: true });
        session = await getAuthSession(shop);
    } catch (error) {
        if (CommerceError.isNotFound(error)) {
            return NextResponse.json({ error: 'shop not found' }, { status: 404, headers: noStoreHeaders });
        }
        trace.getActiveSpan()?.addEvent('convex_token.session_resolution_failed', {
            'error.message': (error as Error)?.message ?? String(error),
            'shop.domain': domain,
        });
        // A shop without (Shopify) customer accounts has no customers to mint for — that is an
        // unauthenticated outcome, while an infra failure stays retryable so the fetcher's
        // `null` degradation remains temporary.
        if (error instanceof CommerceError) {
            return NextResponse.json({ error: 'customer auth unavailable' }, { status: 401, headers: noStoreHeaders });
        }
        return NextResponse.json(
            { error: 'session lookup failed' },
            { status: 503, headers: { ...noStoreHeaders, 'Retry-After': '15' } },
        );
    }

    const email = session?.user?.email?.trim();
    if (!email) {
        return NextResponse.json({ error: 'unauthenticated' }, { status: 401, headers: noStoreHeaders });
    }

    const token = await mintConvexCustomerToken({
        email,
        name: session?.user?.name ?? null,
        id: session?.user?.id ?? null,
        image: session?.user?.image ?? null,
    });
    if (!token) {
        return NextResponse.json(
            { error: 'token minting is not configured' },
            { status: 503, headers: noStoreHeaders },
        );
    }

    return new NextResponse(token, {
        status: 200,
        headers: { ...noStoreHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
    });
}

/**
 * GET handler — the path `fetchConvexTokenFromSession` round-trips (including its
 * `?refresh=1` form; every mint is already a fresh signature, so no cache to bypass).
 * The request object itself is unused: the session comes from cookies via NextAuth.
 *
 * @param ctx - The route context carrying the tenant params.
 * @returns See {@link mintTokenForRequest}.
 */
export async function GET(...[, ctx]: [NextRequest, { params: ConvexTokenRouteParams }]): Promise<NextResponse> {
    return mintTokenForRequest(ctx.params);
}

/**
 * POST handler — identical to GET so non-idempotent clients (and the admin-style
 * `fetch(…, { method: 'POST' })` mint convention) can use the same endpoint.
 *
 * @param ctx - The route context carrying the tenant params.
 * @returns See {@link mintTokenForRequest}.
 */
export async function POST(...[, ctx]: [NextRequest, { params: ConvexTokenRouteParams }]): Promise<NextResponse> {
    return mintTokenForRequest(ctx.params);
}
