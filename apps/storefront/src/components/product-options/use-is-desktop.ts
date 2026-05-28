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
        // iOS <= 13 / Safari < 14 expose only the deprecated `addListener`;
        // `addEventListener` is undefined there, so calling it unconditionally
        // throws inside the effect and bubbles to the page-level error boundary
        // (blank body) — and this hook now runs on every product card.
        if (typeof mql.addEventListener === 'function') {
            mql.addEventListener('change', handler);
        } else if (typeof mql.addListener === 'function') {
            mql.addListener(handler);
        }
        return () => {
            if (typeof mql.removeEventListener === 'function') {
                mql.removeEventListener('change', handler);
            } else if (typeof mql.removeListener === 'function') {
                mql.removeListener(handler);
            }
        };
    }, []);
    return matches;
}
