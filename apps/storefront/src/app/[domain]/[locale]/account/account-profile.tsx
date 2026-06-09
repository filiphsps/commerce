import type { Session } from 'next-auth';
import AccountProfileIsland from '@/components/convex/account-profile-island';
import { AccountProfileSnapshotView } from '@/components/convex/account-profile-snapshot';
import { preloadAccountProfile, toAccountProfileSnapshot } from './account-live-island';

/**
 * Server parent of the SFREAD-08 account profile island. Renders only inside
 * the page's dynamic PPR hole: the cached `AccountShell` (`'use cache'`) takes
 * the dynamic subtree as `children`, and `AccountSession` opens the hole with
 * `await connection()` before reaching the session — so the `preloadQuery` this
 * triggers (per-user token, `no-store`) can never poison a cached scope.
 *
 * Branches on the SFREAD-08 contract: when {@link preloadAccountProfile}
 * returns a handle, the live island mounts and hydrates from that snapshot
 * before upgrading over the WebSocket; when it returns `null` — per-surface
 * kill switch, no deployment URL, no mintable token, or Convex rejecting the
 * token (auth failure) — the read-only session snapshot renders WITHOUT the
 * live client module, so the downgrade sheds the island chunk and socket too.
 *
 * @param props.session - The authenticated customer session from `getAuthSession`.
 * @returns The live island seeded with the preloaded snapshot, or the read-only snapshot view.
 */
export async function AccountProfile({ session }: { session: Session }) {
    const snapshot = toAccountProfileSnapshot(session);
    const preloaded = await preloadAccountProfile(session);

    if (!preloaded) {
        return <AccountProfileSnapshotView profile={snapshot} />;
    }

    return <AccountProfileIsland preloaded={preloaded} snapshot={snapshot} />;
}
