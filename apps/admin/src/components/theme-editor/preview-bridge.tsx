'use client';

import { useMemo } from 'react';

import { LivePreviewIframe } from '@/components/cms/live-preview-iframe';
import { useThemePreview } from './use-theme-preview';

export type PreviewBridgeProps = {
    /**
     * Fully-assembled storefront preview URL, built server-side (via
     * `buildLivePreviewUrl`) so the preview secret never crosses the RSC
     * boundary. Doubles as the source of the `postMessage` target origin.
     */
    previewUrl: string;
    /** Tenant domain — scopes the iframe's per-shop localStorage open/closed state. */
    domain?: string;
};

/**
 * Live theme-preview bridge mounted in the editor's `livePreview` slot.
 *
 * Composes {@link LivePreviewIframe} (the storefront iframe + manual refresh)
 * with {@link useThemePreview} (the form-state → `postMessage` stream). Lives
 * inside the editor `<Form>` context so the hook can subscribe to `theme.*`
 * fields. The `postMessage` target origin is derived from `previewUrl` so it
 * always matches the storefront origin the iframe loads; the handshake is wired
 * through `onIframeReady`. The iframe defaults to open here so the merchant sees
 * the preview alongside the editor.
 *
 * @param props.previewUrl - Server-built storefront preview URL; also the target-origin source.
 * @param props.domain - Tenant domain used to scope the iframe's localStorage open/closed key.
 * @returns The live-preview iframe wired to the theme-edit stream.
 */
export function PreviewBridge({ previewUrl, domain }: PreviewBridgeProps) {
    const targetOrigin = useMemo(() => {
        try {
            return new URL(previewUrl).origin;
        } catch {
            return '';
        }
    }, [previewUrl]);

    const { onIframeReady } = useThemePreview(targetOrigin);

    return (
        <LivePreviewIframe
            previewUrl={previewUrl}
            domain={domain}
            defaultOpen
            showViewportToggle
            onIframeReady={onIframeReady}
        />
    );
}
