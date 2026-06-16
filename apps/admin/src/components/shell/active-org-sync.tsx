'use client';

import { useAuth, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

export type ActiveOrgSyncProps = {
    /** The owning Clerk org of the routed `/[domain]/` shop, or `null` for an un-backfilled shop. */
    clerkOrgId: string | null;
};

/**
 * Keeps Clerk's ACTIVE organization aligned with the routed `/[domain]/` shop — the UI half of the
 * URL-is-canonical reconciliation (spec decision #12 / Task 5.1). When the shop's owning org differs
 * from the session's active org, it calls `setActive` so the `<OrganizationSwitcher>` and any
 * org-scoped Clerk surface reflect the shop the operator is actually viewing.
 *
 * This is consistency-only: Convex authorization already gates on the routed domain via the synced
 * `orgMemberships` mirror (it never reads the active-org claim), so tenant content is NOT blocked on
 * this sync — the layout renders content immediately and this component reconciles in the background.
 * It renders nothing.
 *
 * Skips gracefully when:
 * - the shop carries no `clerkOrgId` (un-backfilled — nothing to sync to),
 * - the Clerk session has not loaded yet (`setActive` is not callable),
 * - the active org already matches (the common steady state — no redundant `setActive`/refresh).
 *
 * A ref guards against re-issuing `setActive` for the same target across renders while the switch and
 * the subsequent `router.refresh` are in flight (the token rotation re-renders this tree before
 * `orgId` updates).
 *
 * @param props.clerkOrgId - The routed shop's owning Clerk org, or `null` when un-backfilled.
 * @returns Nothing — a background side-effect component.
 */
export function ActiveOrgSync({ clerkOrgId }: ActiveOrgSyncProps) {
    const { isLoaded, orgId } = useAuth();
    const { setActive } = useClerk();
    const router = useRouter();
    const syncingTo = useRef<string | null>(null);

    useEffect(() => {
        if (!isLoaded || !clerkOrgId || orgId === clerkOrgId) {
            return;
        }
        if (syncingTo.current === clerkOrgId) {
            return;
        }
        syncingTo.current = clerkOrgId;
        // Refresh AFTER the switch resolves so server components re-render with the now-correct active
        // org (the OrganizationSwitcher and any org-scoped Clerk surface), not on the stale one. On
        // failure, clear the guard so a later render can retry — leaving it pinned would wedge the sync
        // permanently (the org would never re-attempt after a transient `setActive` rejection).
        void setActive({ organization: clerkOrgId })
            .then(() => router.refresh())
            .catch(() => {
                syncingTo.current = null;
            });
    }, [isLoaded, orgId, clerkOrgId, setActive, router]);

    return null;
}
