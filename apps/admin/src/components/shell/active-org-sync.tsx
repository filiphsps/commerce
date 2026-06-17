'use client';

import { useAuth, useOrganizationList } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

export type ActiveOrgSyncProps = {
    /** The owning Clerk org of the routed `/[domain]/` shop, or `null` for an un-backfilled shop. */
    clerkOrgId: string | null;
};

/**
 * Keeps Clerk's ACTIVE organization aligned with the routed `/[domain]/` shop — the UI half of the
 * URL-is-canonical reconciliation (spec decision #12 / Task 5.1). When the shop's owning org differs
 * from the session's active org AND the operator is a member of it, it calls `setActive` so the
 * `<OrganizationSwitcher>` and any org-scoped Clerk surface reflect the shop the operator is viewing.
 *
 * This is consistency-only: Convex authorization already gates on the routed domain via the synced
 * `orgMemberships` mirror (it never reads the active-org claim), so tenant content is NOT blocked on
 * this sync — the layout renders content immediately and this component reconciles in the background.
 * It renders nothing.
 *
 * The membership gate is load-bearing: `setActive` rejects with "given organization cannot be found"
 * when handed an org the session cannot resolve (a backfilled `clerkOrgId` the operator does not
 * belong to, or one from a different Clerk instance). The previous version called `setActive`
 * unconditionally and, on rejection, cleared its guard — so every subsequent render re-fired the
 * doomed switch, and any switch that briefly resolved kicked off a `router.refresh` that re-rendered
 * this tree into another attempt. That churn surfaced the org error on every navigation and bounced
 * reloads through the auth redirect. Gating on actual membership (and never retrying a failed target)
 * removes both.
 *
 * Skips gracefully when:
 * - the shop carries no `clerkOrgId` (un-backfilled — nothing to sync to),
 * - Clerk or the membership list has not loaded yet (`setActive`/the gate are not ready),
 * - the operator is not a member of the target org (switching would reject — leave the active org be),
 * - the active org already matches (the common steady state — no redundant `setActive`/refresh).
 *
 * A ref pins each attempted target so a switch is issued at most once per org: a fulfilled switch
 * advances `orgId` (ending the effect), and a rejected one is NOT retried — re-firing it is exactly
 * the refresh loop this guards against.
 *
 * @param props.clerkOrgId - The routed shop's owning Clerk org, or `null` when un-backfilled.
 * @returns Nothing — a background side-effect component.
 */
export function ActiveOrgSync({ clerkOrgId }: ActiveOrgSyncProps) {
    const { isLoaded: authLoaded, orgId } = useAuth();
    const {
        isLoaded: listLoaded,
        setActive,
        userMemberships,
    } = useOrganizationList({
        userMemberships: { infinite: true },
    });
    const router = useRouter();
    const attempted = useRef<string | null>(null);

    const isLoaded = authLoaded && listLoaded;
    const isMember = !!clerkOrgId && (userMemberships.data ?? []).some((m) => m.organization.id === clerkOrgId);

    useEffect(() => {
        if (!isLoaded || !setActive || !clerkOrgId || orgId === clerkOrgId) {
            return;
        }
        // Only switch to an org the operator demonstrably belongs to — see the component doc: handing
        // `setActive` an unresolvable org rejects and, retried, storms `router.refresh`.
        if (!isMember || attempted.current === clerkOrgId) {
            return;
        }
        attempted.current = clerkOrgId;
        // Refresh AFTER the switch resolves so server components re-render with the now-correct active
        // org (the OrganizationSwitcher and any org-scoped Clerk surface), not on the stale one. A
        // rejection here is swallowed and NOT retried: the guard stays pinned so a transient failure
        // can't re-enter the effect on the next render.
        void setActive({ organization: clerkOrgId })
            .then(() => router.refresh())
            .catch(() => {});
    }, [isLoaded, isMember, orgId, clerkOrgId, setActive, router]);

    return null;
}
