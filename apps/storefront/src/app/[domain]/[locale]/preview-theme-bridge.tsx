'use client';

import { useEffect } from 'react';

/**
 * Shape of the live-preview messages posted by the admin theme editor.
 *
 * `vars` are `[name, value]` pairs applied via `setProperty`; `remove` lists
 * variable names to clear via `removeProperty` so the runtime-derived tokens
 * (accent light/dark shades, `focusRing: var(--accent)`) resume tracking the
 * SSR `<style>` instead of staying pinned to a stale override.
 */
type ThemePreviewMessage = {
    type: 'theme-preview';
    vars?: Array<[name: string, value: string]>;
    remove?: string[];
};

/**
 * Narrows an untrusted `postMessage` payload to a {@link ThemePreviewMessage}.
 *
 * @param data - The raw `MessageEvent.data` of unknown shape.
 * @returns `true` when `data` is a well-formed theme-preview message.
 */
function isThemePreviewMessage(data: unknown): data is ThemePreviewMessage {
    return typeof data === 'object' && data !== null && (data as { type?: unknown }).type === 'theme-preview';
}

/**
 * Client bridge that lets the admin theme editor stream CSS-variable overrides
 * into this storefront iframe without a save or reload.
 *
 * Listens for `theme-preview` messages from the embedding admin window, rejecting
 * any whose `event.origin` does not match `adminOrigin`. Each `[name, value]` pair
 * is written to `document.documentElement` via `setProperty`, overriding the SSR
 * `<style>` block emitted by `CssVariablesProvider`; names in `remove` are cleared
 * via `removeProperty` so derived shades resume runtime derivation. On mount it
 * posts `theme-preview-ready` to the parent so the admin can release its first
 * (debounced) edit, which would otherwise be dropped before this listener exists.
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
        window.parent.postMessage({ type: 'theme-preview-ready' }, adminOrigin);

        return () => window.removeEventListener('message', onMessage);
    }, [adminOrigin]);

    return null;
}
