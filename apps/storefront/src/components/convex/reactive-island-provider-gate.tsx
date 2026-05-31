import { draftMode } from 'next/headers';
import type { ReactNode } from 'react';
import ReactiveIslandProvider from './reactive-island-provider';

/**
 * Draft-gated server boundary that mounts the Convex provider only for the
 * storefront's Lane-2 reactive surface, leaving the anonymous Lane-1 render
 * byte-for-byte untouched.
 *
 * `draftMode().isEnabled` is the single request API readable inside a `use cache`
 * scope without forcing the layout dynamic, so this gate can sit inside the
 * prerendered `CachedShell` (spec §2.3): when draft is **off** it returns the
 * exact `children` node it received — adding no DOM and no Convex client chunk to
 * the prerendered static shell — and when draft is **on** (the theme-preview
 * Lane-2 context, already dynamic and uncached) it wraps `children` in the
 * code-split {@link ReactiveIslandProvider}. Auth-gated islands (account, the
 * "just-posted" review) live in their own dynamic segments and mount the same
 * provider there; this gate deliberately reads no cookies/headers so it stays
 * `use cache`-safe.
 *
 * @param props.children - Subtree that may contain Lane-2 reactive islands.
 * @returns `children` unchanged when draft mode is disabled, otherwise `children` wrapped in the Convex provider.
 */
export async function ReactiveIslandProviderGate({ children }: { children: ReactNode }) {
    const { isEnabled } = await draftMode();
    if (!isEnabled) {
        return children;
    }

    return <ReactiveIslandProvider>{children}</ReactiveIslandProvider>;
}
