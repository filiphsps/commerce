'use client';

import { useEffect, useState } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'compact' | 'comfortable' | 'wide';

/**
 * Maps a viewport pixel width to the closest named breakpoint.
 *
 * @param width - Viewport width in pixels (typically window.innerWidth).
 * @returns The corresponding Breakpoint name.
 */
export function resolveBreakpoint(width: number): Breakpoint {
    if (width >= 1536) return 'wide';
    if (width >= 1280) return 'comfortable';
    if (width >= 1024) return 'compact';
    if (width >= 768) return 'tablet';
    return 'mobile';
}

/**
 * Returns the current viewport breakpoint; SSR-safe default is 'comfortable'.
 *
 * @returns The current breakpoint, updated reactively on window resize.
 */
export function useBreakpoint(): Breakpoint {
    const [bp, setBp] = useState<Breakpoint>('comfortable');
    useEffect(() => {
        const update = () => setBp(resolveBreakpoint(window.innerWidth));
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);
    return bp;
}
