'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY_PREFIX = 'cms.live-preview';

export type LivePreviewIframeProps = {
    /**
     * Fully-assembled preview URL. Must be built server-side by the caller
     * so the storefront preview secret never crosses the RSC boundary —
     * it would otherwise land in the iframe `src` attribute in the DOM,
     * letting any signed-in editor lift the bearer token via devtools and
     * mint draft-mode sessions for themselves.
     *
     * `payload.config.ts` defines a private `buildLivePreviewUrl` closure;
     * Phase 1 will export it (or extract it to a shared lib helper) and the
     * server-component caller will invoke it to assemble this string.
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
 * builds the URL server-side and passes the result in via `previewUrl`. This
 * keeps the storefront preview secret out of the RSC payload — passing it as
 * a prop would serialise it across the RSC boundary and embed it in the
 * rendered iframe `src` attribute, where any signed-in editor could lift it
 * from devtools and enable draft mode on their own session.
 *
 * **Cross-origin refresh:** the storefront runs on a different origin than the
 * admin, so `contentWindow.location.reload()` would throw a `SecurityError`.
 * We use `iframe.src = iframe.src` instead, which forces a reload without
 * crossing the same-origin policy. This is a well-known workaround documented
 * in MDN's cross-origin iframe section.
 */
export function LivePreviewIframe({ previewUrl, domain, defaultOpen = false }: LivePreviewIframeProps) {
    const storageKey = domain ? `${STORAGE_KEY_PREFIX}.${domain}.open` : `${STORAGE_KEY_PREFIX}.open`;

    // Initialise from localStorage (if available) — falls back to defaultOpen.
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
                <iframe
                    ref={iframeRef}
                    src={previewUrl}
                    title="Live preview"
                    className="w-full rounded-b-lg"
                    style={{ height: 'calc(100vh - 12rem)', border: 'none' }}
                />
            ) : null}
        </div>
    );
}
