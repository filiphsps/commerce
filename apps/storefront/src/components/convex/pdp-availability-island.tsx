'use client';

import { type ComponentType, type ReactNode, useEffect, useState } from 'react';
import type { PdpLiveAvailabilityProps } from './pdp-availability-island-live';

/**
 * Interaction-gated reactive island that lets the cached Lane-1 availability
 * snapshot coexist with an advisory live Lane-2 upgrade on the **public** PDP
 * (spec §2.5) without the island ever forcing the static shell dynamic.
 *
 * The cached, crawlable snapshot (`children`) renders synchronously on the server
 * and is the real indexed SEO content. This wrapper adds **zero** DOM around it
 * and reads **no** request data (no `cookies()`/`headers()`/`draftMode()`), so it
 * neither alters the prerendered static shell nor poisons the `use cache` scope —
 * the prerender output is byte-identical to the snapshot alone. The Convex
 * subscriber is fetched through a dynamic `import()` fired only by the visitor's
 * first explicit interaction (`pointerdown`/`keydown`/`touchstart`), so anonymous
 * crawlers and idle visitors never download the Convex client nor open a
 * WebSocket. The live leaf unmounts whenever the tab becomes hidden
 * (`visibilitychange` → `document.hidden`), which closes its ephemeral socket, and
 * remounts when the tab is shown again.
 *
 * @param props.children - The cached, crawlable availability snapshot (Lane-1 SEO body).
 * @param props.query - Public Convex availability query reference forwarded to the live leaf.
 * @param props.productId - Shopify product id forwarded to the live leaf.
 * @returns The snapshot, plus the live subscriber once engaged and while the tab is visible.
 */
export function PdpAvailabilityIsland({
    children,
    query,
    productId,
}: {
    children: ReactNode;
} & PdpLiveAvailabilityProps) {
    const [Live, setLive] = useState<ComponentType<PdpLiveAvailabilityProps> | null>(null);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        let active = true;

        const engage = () => {
            import('./pdp-availability-island-live')
                .then((module) => {
                    if (active) {
                        setLive(() => module.default);
                    }
                })
                .catch(() => undefined);
        };

        const interactionEvents = ['pointerdown', 'keydown', 'touchstart'] as const;
        for (const type of interactionEvents) {
            window.addEventListener(type, engage, { once: true, passive: true });
        }

        const syncVisibility = () => setVisible(!document.hidden);
        document.addEventListener('visibilitychange', syncVisibility);

        return () => {
            active = false;
            for (const type of interactionEvents) {
                window.removeEventListener(type, engage);
            }
            document.removeEventListener('visibilitychange', syncVisibility);
        };
    }, []);

    return (
        <>
            {children}
            {Live && visible ? <Live query={query} productId={productId} /> : null}
        </>
    );
}
