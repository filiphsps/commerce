import type { AuthTokenFetcher } from 'convex/react';

/**
 * Path the default {@link fetchConvexTokenFromSession} source hits to exchange the current NextAuth
 * (Auth.js) session for a Convex-validatable RS256 JWT. A same-origin endpoint (rather than reading
 * the session cookie directly) because the cookie is an encrypted JWE the browser cannot mint a
 * signed token from, and because the minting key must stay server-side.
 */
export const CONVEX_AUTH_TOKEN_ENDPOINT = '/api/auth/convex-token/';

/**
 * Produces the latest Convex bearer JWT for the signed-in customer, or `null` when there is none.
 * `forceRefresh` is threaded to the endpoint so it can bypass any server-side cache and re-mint
 * against a freshly-rotated NextAuth session.
 */
export type ConvexTokenSource = (options: { forceRefresh: boolean }) => Promise<string | null>;

/**
 * Default {@link ConvexTokenSource}: round-trips {@link CONVEX_AUTH_TOKEN_ENDPOINT} for a fresh token.
 *
 * Returns `null` (never throws) on any non-OK response or network error so the caller renders the
 * read-only preloaded snapshot instead of blanking the island (spec §2.3, Track A degraded contract).
 * `credentials: 'same-origin'` sends the session cookie; `cache: 'no-store'` guarantees a genuine
 * round-trip on every forced refresh rather than a stale cached body.
 *
 * @param options.forceRefresh - When `true`, asks the endpoint to bypass its cache and re-mint.
 * @returns The minted JWT, or `null` when unauthenticated / on failure.
 */
export const fetchConvexTokenFromSession: ConvexTokenSource = async ({ forceRefresh }) => {
    try {
        const response = await fetch(`${CONVEX_AUTH_TOKEN_ENDPOINT}${forceRefresh ? '?refresh=1' : ''}`, {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
        });
        if (!response.ok) return null;

        const token = (await response.text()).trim();
        return token.length > 0 ? token : null;
    } catch {
        return null;
    }
};

/**
 * Builds a Convex {@link AuthTokenFetcher} from a NextAuth-JWT {@link ConvexTokenSource}, for
 * `ConvexReactClient.setAuth` (and the equivalent `ConvexHttpClient`/`setAuth` plumbing).
 *
 * Caches the last good token and only round-trips the source when Convex FORCES a refresh
 * (`forceRefreshToken === true`, set after the server rejects a token or it nears its `exp`) or when
 * no token is cached yet — so the steady state is one network call, not one per query. On a forced
 * refresh the cache is dropped first, so a source that now returns `null` (session expired) reports
 * unauthenticated rather than replaying a stale token. Returning `null` lets `usePreloadedQuery` fall
 * back to its server snapshot instead of blanking (spec §2.3).
 *
 * Only the `AuthTokenFetcher` TYPE is imported from `convex/react`, so this module carries no Convex
 * client runtime bytes and stays out of the anonymous Lane-1 bundle the §5 CSP guard scans; it is
 * consumed exclusively behind the code-split, `draftMode()`/auth-gated Lane-2 provider boundary.
 *
 * @param source - The token source to refresh from; defaults to {@link fetchConvexTokenFromSession}.
 * @returns An {@link AuthTokenFetcher} suitable for `setAuth`.
 */
export function createConvexAuthTokenFetcher(
    source: ConvexTokenSource = fetchConvexTokenFromSession,
): AuthTokenFetcher {
    let cachedToken: string | null = null;

    return async ({ forceRefreshToken }) => {
        if (!forceRefreshToken && cachedToken !== null) {
            return cachedToken;
        }

        cachedToken = null;
        cachedToken = await source({ forceRefresh: forceRefreshToken });
        return cachedToken;
    };
}
