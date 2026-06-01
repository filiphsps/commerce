'use client';

import { type AccentToken, resolveTheme, serializeThemeToCssVars, type ThemeBranding } from '@nordcom/commerce-db/lib/theme';
import { useFormFields } from '@payloadcms/ui';
import { colord, extend } from 'colord';
import a11yPlugin from 'colord/plugins/a11y';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { type FlatThemeFields, unflattenTheme } from './unflatten-theme';

// `luminance()` is provided by the a11y plugin — register it once at module load
// so the accent branding sort mirrors the storefront's `getBrandingColors`.
extend([a11yPlugin]);

/**
 * Message posted to the storefront preview iframe on every (debounced) theme
 * edit. `vars` are the CSS custom properties to `setProperty`; `remove` names
 * properties that were applied by a prior post but no longer differ from the
 * defaults (a token reset) so the bridge `removeProperty`s them, letting derived
 * accent shades and `focusRing: var(--accent)` resume runtime derivation rather
 * than staying pinned to their last preview value.
 */
export type ThemePreviewMessage = {
    type: 'theme-preview';
    vars: Array<[name: string, value: string]>;
    remove: string[];
};

/**
 * Debounce window (ms) for coalescing rapid edits (e.g. dragging a color
 * picker) into a single `postMessage`.
 */
const POST_DEBOUNCE_MS = 120;

/**
 * Picks the branding pair (`primary`/`secondary`) the serializer's accent
 * fan-out needs, mirroring the storefront's `getBrandingColors` accent branch:
 * within each type the lowest-luminance accent wins, and branding only resolves
 * when both a primary and a secondary exist — otherwise the fan-out is skipped
 * and page chrome falls back to its diff-from-default path.
 *
 * @param accents - The resolved theme accents (`theme.colors.accents`, already merged by `resolveTheme`).
 * @returns The primary/secondary branding pair, or `null` when either type is absent.
 */
function brandingFromAccents(accents: ReadonlyArray<AccentToken>): ThemeBranding | null {
    if (accents.length === 0) return null;

    const byLuminance = (a: AccentToken, b: AccentToken) =>
        colord(a.color).luminance() < colord(b.color).luminance() ? -1 : 1;

    const primary = accents.filter(({ type }) => type === 'primary').sort(byLuminance)[0];
    const secondary = accents.filter(({ type }) => type === 'secondary').sort(byLuminance)[0];

    if (!primary || !secondary) return null;
    return { primary, secondary };
}

/**
 * Subscribes to the live `theme.*` form state and streams the resolved CSS
 * custom properties to the storefront preview iframe over `postMessage`.
 *
 * The flat dotted `theme.*` form fields are un-flattened into a `ResolvedShopTheme`
 * shape, resolved against the platform defaults, and serialized with the *same*
 * `serializeThemeToCssVars` the storefront uses for SSR — so the preview matches
 * the eventual published render byte-for-byte. Blank/comment sentinel pairs are
 * dropped; only `--`-prefixed properties are applied. Posting is debounced
 * (~120ms) and held until the iframe completes its `theme-preview-ready`
 * handshake (via the returned `onIframeReady`), so the first edit isn't dropped.
 *
 * @param targetOrigin - The storefront origin to pin `postMessage`'s `targetOrigin` to; an empty string disables posting.
 * @returns `onIframeReady` to hand to {@link LivePreviewIframe} — it captures the iframe window and flushes the current theme on handshake.
 */
export function useThemePreview(targetOrigin: string): { onIframeReady: (win: Window) => void } {
    const fields = useFormFields(([formFields]) => formFields);

    const vars = useMemo(() => {
        const flat: FlatThemeFields = {};
        for (const [path, state] of Object.entries(fields)) {
            if (!path.startsWith('theme.')) continue;
            flat[path] = (state as { value?: unknown } | undefined)?.value;
        }

        const resolved = resolveTheme({ theme: unflattenTheme(flat) });
        const branding = brandingFromAccents(resolved.colors.accents);
        return serializeThemeToCssVars(resolved, branding).filter(([name]) => name.startsWith('--'));
    }, [fields]);

    const varsRef = useRef(vars);
    varsRef.current = vars;

    const windowRef = useRef<Window | null>(null);
    const readyRef = useRef(false);
    // Names applied by the last successful post — diffed against the next post to
    // emit `remove` instructions for tokens that have since reset to default.
    const appliedRef = useRef<Set<string>>(new Set());

    const post = useCallback(
        (current: Array<[name: string, value: string]>) => {
            const win = windowRef.current;
            if (!win || !readyRef.current || targetOrigin === '') return;

            const currentNames = new Set(current.map(([name]) => name));
            const remove: string[] = [];
            for (const name of appliedRef.current) {
                if (!currentNames.has(name)) remove.push(name);
            }

            const message: ThemePreviewMessage = { type: 'theme-preview', vars: current, remove };
            win.postMessage(message, targetOrigin);
            appliedRef.current = currentNames;
        },
        [targetOrigin],
    );

    useEffect(() => {
        const timer = setTimeout(() => post(vars), POST_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [vars, post]);

    const onIframeReady = useCallback(
        (win: Window) => {
            windowRef.current = win;
            readyRef.current = true;
            // Flush the current theme immediately so an edit made before the
            // handshake (held back by `readyRef`) reaches the freshly-mounted frame.
            post(varsRef.current);
        },
        [post],
    );

    return { onIframeReady };
}
