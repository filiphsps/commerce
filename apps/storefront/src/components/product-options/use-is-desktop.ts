'use client';
import { useEffect, useState } from 'react';

const DESKTOP_MEDIA_QUERY = '(min-width: 48em)';

export function useIsDesktop(): boolean {
    const [matches, setMatches] = useState<boolean>(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return true;
        return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
    });
    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const mql = window.matchMedia(DESKTOP_MEDIA_QUERY);
        const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, []);
    return matches;
}
