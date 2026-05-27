import 'server-only';

import type { AuthBridge } from '@nordcom/cart-next';
import { getAuthSession } from '@/auth';
import { getRequestContext } from '@/utils/request-context';

export const authBridge: AuthBridge = {
    /**
     * Resolve the current NextAuth session into a cart-core
     * `BuyerIdentity`. The Shopify customer access token is shipped on
     * `provider.data` rather than at the top level so cart-core's adapter-
     * agnostic shape stays clean — only the Shopify adapter looks inside
     * `provider.data.customerAccessToken`.
     *
     * @returns The buyer identity for the active session, or `null` when no
     *   user is signed in (or when the request context is unavailable).
     */
    async resolve() {
        const ctx = await getRequestContext();
        if (!ctx) return null;
        const session = await getAuthSession(ctx.shop);
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
    },
};
