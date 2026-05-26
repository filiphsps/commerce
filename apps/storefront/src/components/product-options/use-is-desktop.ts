'use client';
import { useEffect, useState } from 'react';

const DESKTOP_MEDIA_QUERY = '(min-width: 48em)';

/**
 * Track whether the viewport is desktop-sized.
 *
 * The initial render returns `null` so SSR and the first client render
 * agree (server has no `window.matchMedia` and would otherwise diverge
 * from the client). Callers can use that as a "not yet known" sentinel
 * and avoid branching on the result until mounted — branching during
 * SSR would otherwise hydrate the wrong subtree.
 *
 * @returns `true` on desktop, `false` on mobile, `null` until the first
 *          client-side effect runs.
 */
export function useIsDesktop(): boolean | null {
    const [matches, setMatches] = useState<boolean | null>(null);
    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const mql = window.matchMedia(DESKTOP_MEDIA_QUERY);
        setMatches(mql.matches);
        const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, []);
    return matches;
}
