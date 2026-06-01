import { describe, expect, it, vi } from 'vitest';

import { createConvexAuthTokenFetcher, type ConvexTokenSource } from './convex-auth-fetcher';

describe('createConvexAuthTokenFetcher', () => {
    it('caches the first token and only round-trips the source when a refresh is forced', async () => {
        const source = vi.fn<ConvexTokenSource>(async ({ forceRefresh }) => (forceRefresh ? 'token-refreshed' : 'token-initial'));
        const fetchToken = createConvexAuthTokenFetcher(source);

        // First call mints and caches.
        expect(await fetchToken({ forceRefreshToken: false })).toBe('token-initial');
        // Unforced re-read is served from cache — no second round-trip.
        expect(await fetchToken({ forceRefreshToken: false })).toBe('token-initial');
        expect(source).toHaveBeenCalledTimes(1);

        // Forcing a refresh round-trips the source again and surfaces the new token.
        expect(await fetchToken({ forceRefreshToken: true })).toBe('token-refreshed');
        expect(source).toHaveBeenCalledTimes(2);
        expect(source).toHaveBeenLastCalledWith({ forceRefresh: true });
    });

    it('reports unauthenticated (null) when a forced refresh finds no session, never replaying a stale token', async () => {
        let live = true;
        const source: ConvexTokenSource = async () => (live ? 'token-live' : null);
        const fetchToken = createConvexAuthTokenFetcher(source);

        expect(await fetchToken({ forceRefreshToken: false })).toBe('token-live');

        // Session expires; the forced refresh must drop the cached token, not replay it.
        live = false;
        expect(await fetchToken({ forceRefreshToken: true })).toBeNull();
    });
});
