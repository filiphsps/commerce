'use client';

import { THEME_PREVIEW_READY_MESSAGE_TYPE } from '@nordcom/commerce-cms/editor/preview';
import { Monitor, Smartphone } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@/utils/tailwind';

const STORAGE_KEY_PREFIX = 'cms.live-preview';

/** Emulated viewport widths for the preview toggle; desktop fills the panel. */
const VIEWPORTS = {
    desktop: { label: 'Desktop', maxWidth: '100%' },
    mobile: { label: 'Mobile', maxWidth: '390px' },
} as const;

/** The viewport keys the preview iframe can emulate. */
type Viewport = keyof typeof VIEWPORTS;

export type LivePreviewIframeProps = {
    /**
     * Fully-assembled preview URL, built server-side by the caller (the
     * `buildStorefrontPreviewUrl` helper in `lib/storefront-preview.ts`) so
     * the preview-secret env read stays in the RSC. The URL itself embeds the
     * secret as the activation token the storefront's `/api/cms-preview`
     * route verifies before enabling draft mode.
     */
    previewUrl: string;
    /**
     * Tenant domain — used only to scope the `localStorage` key per tenant
     * so different shops don't share an open/closed state in the same
     * browser. Optional; when absent, a single global key is used.
     */
    domain?: string;
    /**
     * Open by default. Defaults to `false` — preview is collapsed and a
     * "Show preview" button toggles it. The last user-chosen state is
     * persisted in `localStorage` under `cms.live-preview[.<domain>].open`.
     */
    defaultOpen?: boolean;
    /**
     * Handshake callback fired once the storefront preview has mounted and
     * posted a `theme-preview-ready` message from inside the iframe. Receives
     * the iframe's `contentWindow` so the caller (the theme preview bridge) can
     * `postMessage` token overrides into it. The message's `event.origin` is
     * verified against the storefront origin derived from {@link previewUrl}, so
     * an unrelated frame cannot spoof the handshake.
     *
     * Optional and additive: callers that only need the manual-refresh iframe
     * (every existing usage) omit it and no listener is registered.
     *
     * @param win - The iframe `contentWindow` that emitted `theme-preview-ready`.
     */
    onIframeReady?: (win: Window) => void;
    /**
     * Show a desktop/mobile viewport toggle in the header that constrains the
     * iframe width to emulate a phone. Opt-in (defaults to `false`) so only the
     * theme editor surfaces it; other document previews stay full-width.
     */
    showViewportToggle?: boolean;
    /**
     * The handshake message `type` to await before firing {@link onIframeReady}.
     * Defaults to the theme bridge's `theme-preview-ready`; the content editor
     * passes `content-preview-ready` so the same iframe shell serves both bridges
     * without the storefront's two handshakes crossing wires. A plain string (not
     * a guard function) so it stays a serializable client-component prop.
     */
    readyMessageType?: string;
};

/**
 * Live-preview pane for Payload CMS document edit pages.
 *
 * Renders a collapsible iframe panel with a refresh button. Hidden by default —
 * the user opens it via the toggle in the header bar. The open/closed state
 * persists in `localStorage` under a per-tenant key (`cms.live-preview.<domain>.open`)
 * so different shops don't share state in the same browser session.
 *
 * **Security note:** this component is intentionally URL-agnostic. The caller
 * builds the URL server-side and passes the result in via `previewUrl`, so the
 * env read for the preview secret stays server-side and this component never
 * needs to learn the secret-assembly scheme. The URL itself carries the secret
 * as the draft-mode activation token — visible to the signed-in editor driving
 * the preview, which is the route's trust model (see `cms-preview/route.ts`).
 *
 * **Cross-origin refresh:** the storefront runs on a different origin than the
 * admin, so `contentWindow.location.reload()` would throw a `SecurityError`.
 * We use `iframe.src = iframe.src` instead, which forces a reload without
 * crossing the same-origin policy. This is a well-known workaround documented
 * in MDN's cross-origin iframe section.
 *
 * @param props.previewUrl - Fully-assembled preview URL, built server-side to keep the secret out of the RSC boundary.
 * @param props.domain - Tenant domain used to scope the localStorage open/closed key per shop.
 * @param props.defaultOpen - When true the panel is initially open; defaults to false.
 * @param props.onIframeReady - Optional handshake callback fired with the iframe `contentWindow` after the storefront posts `theme-preview-ready`.
 * @param props.showViewportToggle - When true, renders a desktop/mobile viewport toggle that constrains the iframe width.
 */
export function LivePreviewIframe({
    previewUrl,
    domain,
    defaultOpen = false,
    onIframeReady,
    showViewportToggle = false,
    readyMessageType = THEME_PREVIEW_READY_MESSAGE_TYPE,
}: LivePreviewIframeProps) {
    const storageKey = domain ? `${STORAGE_KEY_PREFIX}.${domain}.open` : `${STORAGE_KEY_PREFIX}.open`;
    const [viewport, setViewport] = useState<Viewport>('desktop');

    // Initialize from localStorage (if available) — falls back to defaultOpen.
    const [isOpen, setIsOpen] = useState<boolean>(() => {
        if (typeof window === 'undefined') return defaultOpen;
        try {
            const stored = window.localStorage.getItem(storageKey);
            if (stored !== null) return stored === 'true';
        } catch {
            // localStorage may be blocked (private browsing, security policy).
        }
        return defaultOpen;
    });

    // Keep localStorage in sync whenever the user toggles.
    useEffect(() => {
        try {
            window.localStorage.setItem(storageKey, String(isOpen));
        } catch {
            // Silently ignore — storage might be disabled.
        }
    }, [isOpen, storageKey]);

    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Storefront → admin handshake: the preview bridge holds its first override
    // post until the iframe content signals it has mounted its message listener,
    // so the first edit isn't dropped into a frame that can't yet receive it.
    // `event.origin` is verified against the storefront origin (the iframe's own
    // origin, derived from previewUrl) so a sibling frame can't spoof readiness.
    useEffect(() => {
        if (!onIframeReady) return;

        let storefrontOrigin: string;
        try {
            storefrontOrigin = new URL(previewUrl).origin;
        } catch {
            // A malformed previewUrl can't be matched against any origin, so the
            // handshake is left unwired rather than accepting messages blindly.
            return;
        }

        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== storefrontOrigin) return;
            const data: unknown = event.data;
            if (typeof data !== 'object' || data === null || (data as { type?: unknown }).type !== readyMessageType) {
                return;
            }

            const win = iframeRef.current?.contentWindow;
            if (win) onIframeReady(win);
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onIframeReady, previewUrl, readyMessageType]);

    const handleRefresh = useCallback(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;
        // `contentWindow.location.reload()` throws SecurityError across origins.
        // Reassigning `src` is the standard cross-origin reload workaround. The
        // self-assignment is intentional — Biome's noSelfAssign is suppressed here.
        // biome-ignore lint/correctness/noSelfAssign: intentional cross-origin iframe reload
        iframe.src = iframe.src;
    }, []);

    const handleToggle = useCallback(() => {
        setIsOpen((prev) => !prev);
    }, []);

    return (
        <div className="flex flex-col rounded-lg border border-border bg-muted/20">
            {/* ── Header bar ── */}
            <div className="flex items-center justify-between gap-2 border-border border-b px-3 py-2">
                <span className="font-medium text-sm">Preview</span>

                <div className="flex items-center gap-1">
                    {/* Viewport toggle — emulates a phone width; only shown when open */}
                    {showViewportToggle && isOpen ? (
                        <div className="mr-1 flex items-center gap-0.5 rounded-md border border-border p-0.5">
                            {(Object.keys(VIEWPORTS) as Viewport[]).map((key) => {
                                const Icon = key === 'mobile' ? Smartphone : Monitor;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setViewport(key)}
                                        aria-label={VIEWPORTS[key].label}
                                        aria-pressed={viewport === key}
                                        className={cn(
                                            'rounded p-1 transition-colors',
                                            viewport === key
                                                ? 'bg-muted text-foreground'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </button>
                                );
                            })}
                        </div>
                    ) : null}

                    {/* Refresh — only shown when open */}
                    {isOpen ? (
                        <button
                            type="button"
                            onClick={handleRefresh}
                            aria-label="Refresh preview"
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                            {/* Reload icon (inline SVG — no external dependency) */}
                            <svg
                                aria-hidden="true"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-4 w-4"
                            >
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                <path d="M3 3v5h5" />
                            </svg>
                        </button>
                    ) : null}

                    {/* Show / hide toggle */}
                    <button
                        type="button"
                        onClick={handleToggle}
                        aria-label={isOpen ? 'Hide preview' : 'Show preview'}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        {isOpen ? (
                            // Chevron up / collapse icon
                            <svg
                                aria-hidden="true"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-4 w-4"
                            >
                                <path d="m18 15-6-6-6 6" />
                            </svg>
                        ) : (
                            // Chevron down / expand icon
                            <svg
                                aria-hidden="true"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-4 w-4"
                            >
                                <path d="m6 9 6 6 6-6" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* ── Preview body ──
                  The iframe is entirely omitted when closed so the storefront
                  does not load in the background. When open, the iframe fills
                  the available panel height. */}
            {isOpen ? (
                <div className="flex justify-center rounded-b-lg bg-muted/20 transition-all">
                    <iframe
                        ref={iframeRef}
                        src={previewUrl}
                        title="Live preview"
                        className="w-full rounded-b-lg transition-all"
                        style={{
                            maxWidth: VIEWPORTS[viewport].maxWidth,
                            height: 'calc(100vh - 12rem)',
                            border: 'none',
                        }}
                    />
                </div>
            ) : null}
        </div>
    );
}
