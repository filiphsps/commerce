'use client';

import { ConvexProvider, ConvexReactClient } from 'convex/react';
import type { ReactNode } from 'react';

/**
 * Process-singleton Convex client. Held at module scope so repeated mounts of
 * the provider (e.g. a draft re-render or a route transition) reuse one
 * WebSocket-capable client instead of churning a new connection per render.
 */
let client: ConvexReactClient | undefined;

/**
 * Lazily construct the shared {@link ConvexReactClient} from the public
 * deployment URL.
 *
 * @param url - The Convex deployment URL (`NEXT_PUBLIC_CONVEX_URL`).
 * @returns The process-singleton Convex React client.
 */
function getConvexClient(url: string): ConvexReactClient {
    if (!client) {
        client = new ConvexReactClient(url);
    }
    return client;
}

/**
 * Thin Convex React context provider for the storefront's Lane-2 reactive
 * islands (auth/draft-gated account, reviews, theme preview).
 *
 * This module is the **sole** owner of the `convex/react` import; it is loaded
 * only through the code-split {@link import('./reactive-island-provider')}
 * boundary so its bytes never enter the anonymous Lane-1 client bundle (spec
 * §2.1/§5, enforced by `scripts/assert-no-convex-public-bundle.ts`). It reads
 * **only** the public `NEXT_PUBLIC_CONVEX_URL` — never request data, cookies,
 * or the auth token — so mounting it cannot force the layout dynamic. When the
 * URL is unset the children pass through unchanged, keeping the provider a
 * no-op rather than constructing a client against an invalid origin.
 *
 * @param props.children - Subtree that may consume Convex React context.
 * @returns `children` wrapped in `ConvexProvider`, or `children` unchanged when no URL is configured.
 */
export default function ConvexClientProvider({ children }: { children: ReactNode }) {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) {
        return <>{children}</>;
    }

    return <ConvexProvider client={getConvexClient(url)}>{children}</ConvexProvider>;
}
