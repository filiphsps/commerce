'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';

import { useCartActions, useCartMeta } from './provider';

type SessionData = ReturnType<typeof useSession>['data'];

function getSessionUserId(session: SessionData): string | null {
    if (!session?.user) return null;
    const user = session.user;
    if (typeof user.id === 'string' && user.id.length > 0) return user.id;
    if (typeof user.email === 'string' && user.email.length > 0) return user.email;
    return null;
}

/**
 * Triggers `updateBuyerIdentity` once whenever the NextAuth session transitions
 * to an authenticated user that differs from the last one synced for the
 * current cart. Identity is resolved server-side from `auth()`, so the action
 * itself receives an empty FormData payload — this hook only decides when to
 * fire.
 *
 * @returns nothing; runs as a side effect tied to the NextAuth session.
 */
export function useSyncBuyerIdentity(): void {
    const { data: session, status } = useSession();
    const { updateBuyerIdentity } = useCartActions();
    const meta = useCartMeta();
    const lastSyncedIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (status !== 'authenticated') return;
        const sessionUserId = getSessionUserId(session);
        if (!sessionUserId) return;
        if (sessionUserId === lastSyncedIdRef.current) return;
        if (meta.buyerIdentity?.email && meta.buyerIdentity.email === session?.user?.email) {
            lastSyncedIdRef.current = sessionUserId;
            return;
        }
        lastSyncedIdRef.current = sessionUserId;
        updateBuyerIdentity();
    }, [status, session, updateBuyerIdentity, meta.buyerIdentity?.email]);
}
