'use client';

import { useEffect, useState } from 'react';

/**
 * Track the bottom inset, in CSS pixels, between the layout viewport and the
 * visual viewport — i.e. how much of the bottom of the page is currently
 * occluded by transient browser UI such as the on-screen keyboard.
 *
 * iOS Safari ignores `interactiveWidget: 'resizes-content'`, so the layout
 * viewport (and any `position: fixed; bottom: 0` element) does not shrink when
 * the keyboard opens — only the visual viewport does. Reading
 * `window.visualViewport` is the only reliable way to keep a bottom-anchored
 * CTA above the keyboard there.
 *
 * The initial render returns `null` so SSR and the first client render agree
 * (the server has no `window.visualViewport`). Callers use that as a
 * "not yet known" sentinel and fall back to `env(safe-area-inset-bottom)`
 * alone until the first client-side effect runs; the sentinel also persists
 * when `visualViewport` is unsupported.
 *
 * @returns The bottom inset in pixels (`0` when nothing is occluded), or `null`
 *          until the first client-side effect runs or when `visualViewport` is
 *          unsupported.
 */
export function useVisualViewportInset(): number | null {
    const [inset, setInset] = useState<number | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.visualViewport) return;
        const viewport = window.visualViewport;

        const update = () => {
            const occluded = window.innerHeight - viewport.height - viewport.offsetTop;
            setInset(occluded > 0 ? occluded : 0);
        };
        update();

        viewport.addEventListener('resize', update);
        viewport.addEventListener('scroll', update);
        return () => {
            viewport.removeEventListener('resize', update);
            viewport.removeEventListener('scroll', update);
        };
    }, []);

    return inset;
}
