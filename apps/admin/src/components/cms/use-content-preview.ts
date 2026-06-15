'use client';

import { useFormFields } from '@nordcom/commerce-cms/editor/form';
import { CONTENT_PREVIEW_MESSAGE_TYPE, type ContentPreviewMessage } from '@nordcom/commerce-cms/editor/preview';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { CMS_SAVED_EVENT } from './preview-events';

/** Debounce window (ms) for coalescing rapid keystrokes into one optimistic patch post. */
const PATCH_DEBOUNCE_MS = 120;

/**
 * Subscribes to the live document form state — through the NATIVE form core's
 * `useFormFields`, so it must be mounted under the `<Form>` (the editor's
 * `DocumentFormBody`) — and drives both channels of the hybrid content preview:
 *
 * - **Instant:** every plain-string leaf is streamed as a `[path, value]` patch
 *   (debounced ~120ms) to the storefront iframe, where the bridge writes it to
 *   the matching `[data-cms-field]` element. Non-string leaves (localized
 *   buckets, numbers, JSON/rich-text) are skipped — they can't be safely patched
 *   as text and reconcile through the refresh channel instead.
 * - **Accurate:** on the {@link CMS_SAVED_EVENT} the toolbar fires after a save
 *   persists, a `refresh` ping tells the iframe to `router.refresh()`, re-running
 *   every Server Component (including data-bound async blocks) against the
 *   freshly-written draft.
 *
 * Posting is held until the iframe completes its `content-preview-ready`
 * handshake (via the returned `onIframeReady`) so the first edit isn't dropped.
 *
 * @param targetOrigin - The storefront origin to pin `postMessage`'s target to; an empty string disables posting.
 * @returns `onIframeReady` to hand to `LivePreviewIframe` — captures the iframe window and flushes the current patches on handshake.
 */
export function useContentPreview(targetOrigin: string): { onIframeReady: (win: Window) => void } {
    const fields = useFormFields(([formFields]) => formFields);

    const patches = useMemo(() => {
        const out: Array<[name: string, value: string]> = [];
        for (const [path, state] of Object.entries(fields)) {
            if (typeof state.value === 'string') out.push([path, state.value]);
        }
        return out;
    }, [fields]);

    const patchesRef = useRef(patches);
    patchesRef.current = patches;

    const windowRef = useRef<Window | null>(null);
    const readyRef = useRef(false);

    const postPatches = useCallback(
        (current: Array<[name: string, value: string]>) => {
            const win = windowRef.current;
            if (!win || !readyRef.current || targetOrigin === '') return;
            const message: ContentPreviewMessage = { type: CONTENT_PREVIEW_MESSAGE_TYPE, patches: current };
            win.postMessage(message, targetOrigin);
        },
        [targetOrigin],
    );

    const postRefresh = useCallback(() => {
        const win = windowRef.current;
        if (!win || !readyRef.current || targetOrigin === '') return;
        const message: ContentPreviewMessage = { type: CONTENT_PREVIEW_MESSAGE_TYPE, refresh: true };
        win.postMessage(message, targetOrigin);
    }, [targetOrigin]);

    useEffect(() => {
        const timer = setTimeout(() => postPatches(patches), PATCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [patches, postPatches]);

    useEffect(() => {
        const onSaved = () => postRefresh();
        window.addEventListener(CMS_SAVED_EVENT, onSaved);
        return () => window.removeEventListener(CMS_SAVED_EVENT, onSaved);
    }, [postRefresh]);

    const onIframeReady = useCallback(
        (win: Window) => {
            windowRef.current = win;
            readyRef.current = true;
            // Flush the current values immediately so an edit made before the
            // handshake (held back by `readyRef`) reaches the freshly-mounted frame.
            postPatches(patchesRef.current);
        },
        [postPatches],
    );

    return { onIframeReady };
}
