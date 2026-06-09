'use client';

import { type Preloaded, useConvex, usePreloadedQuery } from 'convex/react';
import { useEffect } from 'react';
import { createConvexAuthTokenFetcher } from '@/lib/convex-auth-fetcher';
import type { AccountProfileQuery, AccountProfileSnapshot } from './account-profile-contract';
import { AccountProfileSnapshotView } from './account-profile-snapshot';
import ConvexClientProvider from './convex-client-provider';

/**
 * Props shared by the live subscriber and the code-split
 * {@link import('./account-profile-island').default} wrapper that mounts it.
 */
export type AccountProfileIslandLiveProps = {
    preloaded: Preloaded<AccountProfileQuery>;
    snapshot: AccountProfileSnapshot;
};

/**
 * Reactive leaf implementing snapshot-then-live: `usePreloadedQuery` renders the
 * server-preloaded value SYNCHRONOUSLY on first paint (identical to the server
 * render — no loading state exists in this component, so a downed socket can
 * never strand a spinner; the hook simply keeps returning the snapshot until the
 * subscription delivers) and upgrades in place once the WebSocket result lands.
 * The CONVEXCORE-14 auth fetcher is attached to the shared client on mount so
 * the subscription carries the customer's NextAuth-minted JWT; when Convex
 * rejects it (expired/forged/unauthenticated) the hook throws and the wrapper's
 * `IslandErrorBoundary` degrades to the read-only snapshot — auth failure never
 * blanks the surface (spec §2.3).
 *
 * @param props.preloaded - The serialized `preloadQuery` handle produced inside the dynamic PPR hole.
 * @param props.snapshot - Session-derived profile rendered when the live result is `null`.
 * @returns The profile view fed from the preloaded-then-live query result.
 */
function AccountProfileLiveSubscriber({ preloaded, snapshot }: AccountProfileIslandLiveProps) {
    const convex = useConvex();

    useEffect(() => {
        convex.setAuth(createConvexAuthTokenFetcher());
        return () => {
            convex.clearAuth();
        };
    }, [convex]);

    const live = usePreloadedQuery(preloaded);

    return <AccountProfileSnapshotView profile={live ?? snapshot} live={live !== null} />;
}

/**
 * Code-split entry for the account profile island — the account surface's only
 * module carrying `convex/react` runtime bytes. It is reached exclusively
 * through the wrapper's `next/dynamic` boundary, so the chunk is lazily
 * code-split and never appears in any route's EAGER manifest chunk list, which
 * is precisely the mechanism `scripts/assert-no-convex-public-bundle.ts`
 * sanctions for Lane-2 islands. As an auth-gated Lane-2 surface it reuses the
 * process-singleton client via {@link ConvexClientProvider} (unlike the public
 * PDP island's ephemeral socket); when `NEXT_PUBLIC_CONVEX_URL` is unset that
 * provider mounts no context, `useConvex` throws, and the wrapper's boundary
 * falls back to the snapshot.
 *
 * @param props.preloaded - The serialized `preloadQuery` handle.
 * @param props.snapshot - Session-derived profile for the `null`-result fallback.
 * @returns The live subscriber wrapped in the shared Convex provider.
 */
export default function AccountProfileIslandLive(props: AccountProfileIslandLiveProps) {
    return (
        <ConvexClientProvider>
            <AccountProfileLiveSubscriber {...props} />
        </ConvexClientProvider>
    );
}
