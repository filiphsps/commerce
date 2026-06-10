'use client';

import { isThemePreviewMessage, THEME_PREVIEW_READY_MESSAGE_TYPE } from '@nordcom/commerce-cms/editor/preview';
import { useEffect } from 'react';

/**
 * Client bridge that lets the admin theme editor stream CSS-variable overrides
 * into this storefront iframe without a save or reload.
 *
 * Listens for `theme-preview` messages from the embedding admin window, rejecting
 * any whose `event.origin` does not match `adminOrigin` — the storefront half of
 * the BOTH-directions origin verification (the admin half pins the storefront
 * origin on its `theme-preview-ready` listener). Payload shape is narrowed via
 * the shared `@nordcom/commerce-cms/editor/preview` guard so a malformed message
 * from the allowed origin is dropped too. Each `[name, value]` pair is written to
 * `document.documentElement` via `setProperty`, overriding the SSR `<style>`
 * block emitted by `CssVariablesProvider`; names in `remove` are cleared via
 * `removeProperty` so derived shades resume runtime derivation. On mount it
 * posts `theme-preview-ready` to the parent — `targetOrigin` pinned to
 * `adminOrigin`, so the handshake never leaks to a foreign embedder — letting
 * the admin release its first (debounced) edit, which would otherwise be
 * dropped before this listener exists.
 *
 * @param adminOrigin - The exact origin (`https://admin.example`) allowed to drive previews.
 * @returns Nothing rendered; the bridge is effect-only.
 */
export function PreviewThemeBridge({ adminOrigin }: { adminOrigin: string }) {
    useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            if (event.origin !== adminOrigin) return;
            if (!isThemePreviewMessage(event.data)) return;

            const root = document.documentElement;

            for (const name of event.data.remove ?? []) {
                if (name.startsWith('--')) {
                    root.style.removeProperty(name);
                }
            }

            for (const [name, value] of event.data.vars ?? []) {
                // Skip the serializer's blank-name formatting sentinels; only real
                // custom properties get applied to the live document.
                if (name.startsWith('--')) {
                    root.style.setProperty(name, value);
                }
            }
        };

        window.addEventListener('message', onMessage);
        window.parent.postMessage({ type: THEME_PREVIEW_READY_MESSAGE_TYPE }, adminOrigin);

        return () => window.removeEventListener('message', onMessage);
    }, [adminOrigin]);

    return null;
}
