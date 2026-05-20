'use client';

import { useEffect, useState } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'compact' | 'comfortable' | 'wide';

export function resolveBreakpoint(width: number): Breakpoint {
    if (width >= 1536) return 'wide';
    if (width >= 1280) return 'comfortable';
    if (width >= 1024) return 'compact';
    if (width >= 768) return 'tablet';
    return 'mobile';
}

/** Returns the current breakpoint; SSR-safe default is 'comfortable'. */
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
