'use client';

import type { BuyerIdentity } from '@nordcom/cart-core';
import type { ClientAuthBridge } from '@nordcom/cart-react';
import { SessionContext, type useSession } from 'next-auth/react';
import { useContext } from 'react';

type SessionData = ReturnType<typeof useSession>['data'];

/**
 * Map a NextAuth session into the cart-core `BuyerIdentity` shape. Keeps the
 * Shopify customer access token nested under `provider.data` so cart-core
 * stays adapter-agnostic — only the Shopify adapter reads from `provider`.
 *
 * @param session - NextAuth session data, or `null` when signed out.
 * @returns The buyer identity, or `null` when no signed-in user.
 */
function mapSessionToIdentity(session: SessionData): BuyerIdentity | null {
    if (!session?.user) return null;
    return {
        email: session.user.email ?? undefined,
        ...(session.user.shopifyAccessToken
            ? {
                  provider: {
                      type: 'shopify' as const,
                      data: { customerAccessToken: session.user.shopifyAccessToken },
                  },
              }
            : {}),
    };
}

export const clientAuthBridge: ClientAuthBridge = {
    useBuyerIdentity() {
        // The storefront only mounts `<SessionProvider />` inside the
        // `/account` subtree, so `useSession()` would throw on every other
        // route. Probe the raw context first and short-circuit when no
        // provider is present, matching the pre-extraction behavior of
        // `<BuyerIdentitySync />` which guarded against the same condition.
        const sessionCtx = useContext(SessionContext);
        if (sessionCtx === undefined) {
            return { identity: null, updatedAt: 0 };
        }
        return {
            identity: mapSessionToIdentity(sessionCtx.data),
            updatedAt: (sessionCtx as never as { lastUpdate?: number }).lastUpdate ?? 0,
        };
    },
};
