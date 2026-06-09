'use client';

import dynamic from 'next/dynamic';
import type { AccountProfileIslandLiveProps } from './account-profile-island-live';
import { AccountProfileSnapshotView } from './account-profile-snapshot';
import { IslandErrorBoundary } from './island-error-boundary';

/**
 * Code-split handle to the Convex-bearing live module. `next/dynamic` keeps the
 * `convex/react` runtime in a lazily-loaded chunk that no route references
 * eagerly — the sanctioned Lane-2 mechanism the manifest-aware
 * `scripts/assert-no-convex-public-bundle.ts` guard permits (lazy chunks live in
 * the react-loadable manifest, not any route's eager chunk list). `ssr: false`
 * is intentionally avoided so the island's FIRST paint is the server-rendered
 * snapshot markup itself: `usePreloadedQuery` renders the preloaded value during
 * SSR, making server HTML and client hydration byte-identical until the live
 * subscription upgrades it.
 */
const AccountProfileIslandLive = dynamic(() => import('./account-profile-island-live'));

/**
 * Client boundary for the SFREAD-08 account profile island. Carries no Convex
 * symbols of its own (only a type import, erased at compile time): the
 * `convex/react` bytes stay behind the dynamic boundary above. Wraps the live
 * module in {@link IslandErrorBoundary} so every failure mode — Convex rejecting
 * the auth token, provider/socket setup throwing, or the island chunk failing to
 * load — degrades to the read-only session snapshot rather than a blank region
 * or an infinite spinner (the spec §2.3 degraded contract).
 *
 * @param props.preloaded - The serialized `preloadQuery` handle from the dynamic PPR hole.
 * @param props.snapshot - Session-derived profile used for first paint and every degraded branch.
 * @returns The live island guarded by the snapshot-fallback error boundary.
 */
export default function AccountProfileIsland({ preloaded, snapshot }: AccountProfileIslandLiveProps) {
    return (
        <IslandErrorBoundary fallback={<AccountProfileSnapshotView profile={snapshot} />}>
            <AccountProfileIslandLive preloaded={preloaded} snapshot={snapshot} />
        </IslandErrorBoundary>
    );
}
