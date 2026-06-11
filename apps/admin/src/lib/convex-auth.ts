import 'server-only';

import { auth } from '@/auth';

/**
 * The slice of the Convex server client (`ConvexHttpClient` from `convex/browser`) this module
 * drives: `setAuth(token)` attaches a bearer JWT to every subsequent request so Convex functions
 * see a server-trusted identity, and `clearAuth()` detaches it. Typed structurally — rather than
 * importing `convex/browser` — so the admin app needs no direct `convex` runtime dependency for the
 * identity seam; the concrete client is instantiated through the `packages/db` seam (which owns the
 * `convex` dependency) and CONVEXCORE-16 passes it here. `ConvexHttpClient` satisfies this shape.
 */
export interface ConvexServerAuthClient {
    setAuth(token: string): void;
    clearAuth(): void;
}

/**
 * The server-trusted operator identity extracted from the NextAuth session and handed to the token
 * minter. `email` is the load-bearing claim — it is what Convex's `lib/auth.ts` (`resolveUserFromIdentity`)
 * maps onto a `users` row via the `by_email` index — so it is required; `name` is an optional display
 * claim. Deliberately a SMALL, explicit shape rather than the raw `auth()` return, whose overloaded
 * union (the bare-call form vs. the middleware-wrapper form) does not narrow cleanly to a session.
 */
export interface ConvexOperatorIdentity {
    email: string;
    name?: string | null;
    /**
     * The operator's ACTIVE tenant selection — the route-resolved shop's external id
     * (`shops.legacyId`). When present the minter stamps it as the token's active-shop claim, which
     * is how a multi-shop operator's request disambiguates server-side (Convex re-verifies the
     * membership before honoring it). Absent on cross-tenant routes and for callers predating the
     * selection seam: the claim-less token keeps the single-membership fallback.
     */
    activeShop?: string;
}

/**
 * Mints the Convex-validatable bearer JWT for an authenticated operator.
 *
 * NextAuth's own session cookie is an encrypted JWE that Convex cannot verify, so the integration
 * signs a separate RS256 JWT carrying the operator's identity (the claims Convex's `auth.config.ts`
 * + `lib/auth.ts` validate). The signing key / endpoint is deployment infrastructure, so the minter is
 * INJECTED rather than implemented here — keeping this file the dependency-light plumbing seam and
 * letting CONVEXCORE-16 supply the concrete RS256 minter. Returns `null` when no token can be issued
 * (treated as unauthenticated downstream).
 */
export type ConvexTokenMinter = (operator: ConvexOperatorIdentity) => Promise<string | null>;

/**
 * Attaches the current admin operator's Convex bearer token to a server-side Convex HTTP client.
 *
 * Gates strictly on the server-trusted NextAuth session (`auth()`), never a client-supplied value:
 * with no authenticated operator (no session, or a session without an email) the client's auth is
 * CLEARED and `null` returned, so an unauthenticated request can never leak a stale identity into
 * Convex. Otherwise the injected {@link ConvexTokenMinter} produces the operator's token and it is
 * applied via `setAuth`. The resulting identity is what `resolveAdminShopId` (CONVEXCORE-14
 * `lib/auth.ts`) maps to a server-trusted `shopId` for the tenant tier.
 *
 * @param client - The server-side Convex client to authenticate (a `ConvexHttpClient`).
 * @param mintToken - Produces the operator's Convex-validatable RS256 JWT from their identity.
 * @returns The applied bearer token, or `null` when there is no authenticated operator.
 */
export async function authenticateConvexClient(
    client: ConvexServerAuthClient,
    mintToken: ConvexTokenMinter,
): Promise<string | null> {
    const session = await auth();
    const email = session?.user?.email?.trim();
    if (!email) {
        client.clearAuth();
        return null;
    }

    const token = await mintToken({ email, name: session?.user?.name });
    if (!token) {
        client.clearAuth();
        return null;
    }

    client.setAuth(token);
    return token;
}
