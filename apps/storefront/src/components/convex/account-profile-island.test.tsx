import type { Preloaded } from 'convex/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/utils/test/react';

import type { AccountProfileQuery, AccountProfileSnapshot } from './account-profile-contract';
import AccountProfileIslandLive from './account-profile-island-live';
import { AccountProfileSnapshotView } from './account-profile-snapshot';
import { IslandErrorBoundary } from './island-error-boundary';

const convex = vi.hoisted(() => ({
    usePreloadedQuery: vi.fn<() => AccountProfileSnapshot | null>(),
    setAuth: vi.fn(),
    clearAuth: vi.fn(),
}));

// The island under test must behave identically with and without a live
// socket; the mock stands in for the Convex runtime so each test scripts what
// the subscription delivers (snapshot replay, live upgrade, or an auth throw).
vi.mock('convex/react', () => ({
    ConvexProvider: ({ children }: { children: ReactNode }) => children,
    ConvexReactClient: vi.fn(),
    useConvex: () => ({ setAuth: convex.setAuth, clearAuth: convex.clearAuth }),
    usePreloadedQuery: convex.usePreloadedQuery,
}));

/** The session-derived snapshot every degraded branch must keep painting. */
const SNAPSHOT: AccountProfileSnapshot = {
    id: 'customer-1',
    name: 'Jane Customer',
    email: 'jane@example.com',
    image: null,
};

/** Opaque preloaded handle; the mocked hook scripts its observable value. */
const PRELOADED = { _name: 'account/profile:get' } as unknown as Preloaded<AccountProfileQuery>;

describe('AccountProfileIslandLive (snapshot-then-live)', () => {
    beforeEach(() => {
        convex.usePreloadedQuery.mockReset();
        convex.setAuth.mockClear();
        convex.clearAuth.mockClear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('hydrates synchronously from the preloaded snapshot — socket-down keeps the snapshot, never a spinner', () => {
        // While the WebSocket is down, `usePreloadedQuery` keeps returning the
        // server-preloaded value; the island has no loading state at all.
        convex.usePreloadedQuery.mockReturnValue(SNAPSHOT);

        render(<AccountProfileIslandLive preloaded={PRELOADED} snapshot={SNAPSHOT} />);

        const island = screen.getByTestId('account-profile');
        expect(island).toHaveTextContent('jane@example.com');
        expect(island).toHaveTextContent('Jane Customer');
        expect(document.querySelector('[data-skeleton]')).toBeNull();
        expect(convex.usePreloadedQuery).toHaveBeenCalledWith(PRELOADED);
    });

    it('upgrades in place once the live subscription delivers a fresher profile', () => {
        convex.usePreloadedQuery.mockReturnValue({ ...SNAPSHOT, name: 'Jane Renamed-Live' });

        render(<AccountProfileIslandLive preloaded={PRELOADED} snapshot={SNAPSHOT} />);

        const island = screen.getByTestId('account-profile');
        expect(island).toHaveTextContent('Jane Renamed-Live');
        expect(island).toHaveAttribute('data-live', 'true');
    });

    it('falls back to the session snapshot when the live query resolves to null', () => {
        convex.usePreloadedQuery.mockReturnValue(null);

        render(<AccountProfileIslandLive preloaded={PRELOADED} snapshot={SNAPSHOT} />);

        const island = screen.getByTestId('account-profile');
        expect(island).toHaveTextContent('jane@example.com');
        expect(island).toHaveAttribute('data-live', 'false');
    });

    it('attaches the CONVEXCORE-14 auth token fetcher on mount and detaches it on unmount', () => {
        convex.usePreloadedQuery.mockReturnValue(SNAPSHOT);

        const { unmount } = render(<AccountProfileIslandLive preloaded={PRELOADED} snapshot={SNAPSHOT} />);

        expect(convex.setAuth).toHaveBeenCalledTimes(1);
        expect(convex.setAuth.mock.calls[0]?.[0]).toBeTypeOf('function');

        unmount();
        expect(convex.clearAuth).toHaveBeenCalledTimes(1);
    });

    it('renders the read-only snapshot (not blank) when Convex rejects the auth token', () => {
        // An auth-rejected subscription surfaces as a throw from the query
        // hook; the wrapper's boundary must catch it and keep the snapshot.
        convex.usePreloadedQuery.mockImplementation(() => {
            throw new TypeError('Unauthenticated: token rejected');
        });
        // React logs caught boundary errors; keep the suite output clean.
        vi.spyOn(console, 'error').mockImplementation(() => undefined);

        render(
            <IslandErrorBoundary fallback={<AccountProfileSnapshotView profile={SNAPSHOT} />}>
                <AccountProfileIslandLive preloaded={PRELOADED} snapshot={SNAPSHOT} />
            </IslandErrorBoundary>,
        );

        const island = screen.getByTestId('account-profile');
        expect(island).toHaveTextContent('jane@example.com');
        expect(island).toHaveAttribute('data-live', 'false');
    });
});

describe('IslandErrorBoundary', () => {
    it('renders children until a failure, then the fallback', () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);

        /**
         * Child that always throws, standing in for a failed island subtree.
         *
         * @returns Never returns; always throws.
         */
        function Exploding(): ReactNode {
            throw new TypeError('island subtree failed');
        }

        render(
            <IslandErrorBoundary fallback={<output data-testid="degraded">snapshot</output>}>
                <Exploding />
            </IslandErrorBoundary>,
        );

        expect(screen.getByTestId('degraded')).toHaveTextContent('snapshot');
        vi.restoreAllMocks();
    });
});
