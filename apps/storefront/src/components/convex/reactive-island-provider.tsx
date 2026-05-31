'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

/**
 * Code-split handle to the heavy {@link import('./convex-client-provider')}.
 *
 * `next/dynamic` isolates `ConvexReactClient` + the `convex/react` runtime into
 * a lazily-loaded chunk that is fetched only when this boundary actually renders
 * — i.e. inside a Lane-2 (`draftMode()`/auth) gate. Anonymous Lane-1 routes never
 * reference this boundary, so they never download the Convex client, keeping the
 * public bundle Convex-free (spec §2.1/§5). `ssr: false` is intentionally avoided
 * so the wrapped children still server-render inside a draft/auth context; the
 * Convex client itself only attaches on the client where the WebSocket lives, and
 * server-side Convex bytes are permitted by the public-bundle guard.
 */
const ConvexClientProvider = dynamic(() => import('./convex-client-provider'));

/**
 * Client boundary that mounts the code-split Convex provider for Lane-2 islands.
 *
 * Kept separate from {@link ConvexClientProvider} so the `convex/react` import
 * lives behind the dynamic boundary rather than in this statically-referenced
 * wrapper. This component carries no Convex symbols of its own.
 *
 * @param props.children - Subtree rendered inside the lazily-loaded Convex provider.
 * @returns `children` wrapped in the code-split Convex provider.
 */
export default function ReactiveIslandProvider({ children }: { children: ReactNode }) {
    return <ConvexClientProvider>{children}</ConvexClientProvider>;
}
