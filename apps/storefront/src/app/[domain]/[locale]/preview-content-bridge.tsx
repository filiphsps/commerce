'use client';

import { CONTENT_PREVIEW_READY_MESSAGE_TYPE, isContentPreviewMessage } from '@nordcom/commerce-cms/editor/preview';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Client bridge that lets the admin CMS content editor preview unsaved edits in
 * this storefront iframe — the content counterpart of {@link PreviewThemeBridge}.
 *
 * Drives the two channels of the hybrid preview pipe:
 * - **Instant:** `patches` (`[dotted-path, text]` pairs) are written to the
 *   `textContent` of the matching `[data-cms-field]` elements the storefront
 *   emits ONLY in preview, so a plain-text edit shows before any save lands.
 * - **Accurate:** a `refresh` flag triggers `router.refresh()`, re-running the
 *   page's Server Components against the freshly-autosaved draft (`draftMode`
 *   already serves the live draft row) — the only way to re-render data-bound
 *   async blocks (`collection`, `vendors`) and rich-text the client can't
 *   reconstruct from a serialized document.
 *
 * Every message is rejected unless `event.origin` matches `adminOrigin` (the
 * storefront half of the both-directions origin check) and passes the shared
 * `@nordcom/commerce-cms/editor/preview` shape guard. On mount it posts
 * `content-preview-ready` to the parent — `targetOrigin` pinned to `adminOrigin`
 * — so the admin can flush its first (debounced) edit once this listener exists.
 *
 * @param adminOrigin - The exact origin (`https://admin.example`) allowed to drive previews.
 * @returns Nothing rendered; the bridge is effect-only.
 */
export function PreviewContentBridge({ adminOrigin }: { adminOrigin: string }) {
    const router = useRouter();

    useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            if (event.origin !== adminOrigin) return;
            if (!isContentPreviewMessage(event.data)) return;

            const patches = event.data.patches;
            if (patches && patches.length > 0) {
                const byPath = new Map(patches);
                for (const node of document.querySelectorAll<HTMLElement>('[data-cms-field]')) {
                    const value = byPath.get(node.dataset.cmsField ?? '');
                    if (value !== undefined) node.textContent = value;
                }
            }

            if (event.data.refresh) router.refresh();
        };

        window.addEventListener('message', onMessage);
        window.parent.postMessage({ type: CONTENT_PREVIEW_READY_MESSAGE_TYPE }, adminOrigin);

        return () => window.removeEventListener('message', onMessage);
    }, [adminOrigin, router]);

    return null;
}
