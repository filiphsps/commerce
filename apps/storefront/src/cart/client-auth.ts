'use client';

import type { BuyerIdentity } from '@nordcom/cart-core';
import type { ClientAuthBridge } from '@nordcom/cart-react';
import { useSession } from 'next-auth/react';

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
        const session = useSession();
        return {
            identity: mapSessionToIdentity(session.data),
            updatedAt: (session as never as { lastUpdate?: number }).lastUpdate ?? 0,
        };
    },
};
