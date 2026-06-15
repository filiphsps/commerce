'use client';

import { CONTENT_PREVIEW_READY_MESSAGE_TYPE } from '@nordcom/commerce-cms/editor/preview';
import { useMemo } from 'react';

import { LivePreviewIframe } from '@/components/cms/live-preview-iframe';
import { useContentPreview } from './use-content-preview';

export type ContentPreviewBridgeProps = {
    /**
     * Fully-assembled storefront preview URL, built server-side (via
     * `buildStorefrontPreviewUrl`) so the preview secret never crosses the RSC
     * boundary. Doubles as the source of the `postMessage` target origin.
     */
    previewUrl: string;
    /** Tenant domain — scopes the iframe's per-shop localStorage open/closed state. */
    domain?: string;
};

/**
 * Live content-preview bridge mounted in the editor's `livePreview` slot.
 *
 * Composes {@link LivePreviewIframe} with {@link useContentPreview} — the same
 * iframe shell the theme editor reuses, wired here to the content message
 * contract (`content-preview-ready` handshake + `content-preview` patches /
 * refresh). Lives inside the editor `<Form>` so the hook can subscribe to the
 * document fields. The `postMessage` target origin is derived from `previewUrl`
 * so it always matches the storefront origin the iframe loads.
 *
 * @param props.previewUrl - Server-built storefront preview URL; also the target-origin source.
 * @param props.domain - Tenant domain used to scope the iframe's localStorage open/closed key.
 * @returns The live-preview iframe wired to the content-edit stream.
 */
export function ContentPreviewBridge({ previewUrl, domain }: ContentPreviewBridgeProps) {
    const targetOrigin = useMemo(() => {
        try {
            return new URL(previewUrl).origin;
        } catch {
            return '';
        }
    }, [previewUrl]);

    const { onIframeReady } = useContentPreview(targetOrigin);

    return (
        <LivePreviewIframe
            previewUrl={previewUrl}
            domain={domain}
            defaultOpen
            showViewportToggle
            onIframeReady={onIframeReady}
            readyMessageType={CONTENT_PREVIEW_READY_MESSAGE_TYPE}
        />
    );
}
