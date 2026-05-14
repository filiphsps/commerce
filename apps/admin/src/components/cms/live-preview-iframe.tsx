'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'cms.live-preview.open';
const DEFAULT_LOCALE = 'en-US';

export type LivePreviewTarget =
    | { collection: string; slug: string }
    | { global: string };

export type LivePreviewIframeProps = {
    /** Tenant domain — used to scope the preview to the right storefront. */
    domain: string;
    /**
     * What's being previewed.
     *   - `{ collection, slug }` for a collection document (pages, articles, etc.)
     *   - `{ global }` for a global (header, footer, etc.)
     */
    target: LivePreviewTarget;
    /**
     * Current locale (e.g. 'en-US'). Falls back to `en-US` if absent.
     * Callers typically read this from `?locale=…` in the current URL.
     */
    locale?: string;
    /**
     * Open by default. Defaults to `false` — preview is collapsed and a
     * "Show preview" button toggles it. The last user-chosen state is
     * persisted in `localStorage` under `cms.live-preview.open`.
     */
    defaultOpen?: boolean;
    /**
     * Base URL of the storefront (e.g. `http://localhost:1337`).
     * Must be supplied by a server component that has access to the
     * `STOREFRONT_BASE_URL` environment variable.
     */
    storefrontBaseUrl: string;
    /**
     * Preview secret passed as the `?secret=` query parameter. Matches
     * `STOREFRONT_PREVIEW_SECRET`. Pass an empty string if not configured.
     * Must be supplied by a server component that has access to the env var.
     */
    previewSecret?: string;
};

/**
 * Builds the storefront preview URL from the same inputs as
 * `buildLivePreviewUrl` in `apps/admin/src/payload.config.ts`.
 *
 * Kept inline (not extracted to a shared helper) because `payload.config.ts`
 * also needs `process.env` values that only exist on the server — extracting
 * would require duplicating the env-read logic or threading extra parameters
 * through Payload's `LivePreviewConfig.url` callback. For Phase 0, co-locating
 * the URL builder here and accepting the resolved values as props is cleaner.
 */
function buildPreviewUrl({
    storefrontBaseUrl,
    tenantId,
    target,
    locale,
    previewSecret,
}: {
    storefrontBaseUrl: string;
    tenantId: string;
    target: LivePreviewTarget;
    locale: string;
    previewSecret: string;
}): string {
    let previewPath: string;

    if ('global' in target) {
        previewPath = `/${locale}`;
    } else {
        const { collection, slug } = target;
        const handle = slug || 'home';
        if (collection === 'pages') {
            previewPath = `/${locale}/${handle}`;
        } else if (collection === 'articles') {
            previewPath = `/${locale}/blog/${handle}`;
        } else if (collection === 'productMetadata') {
            previewPath = `/${locale}/products/${handle}`;
        } else if (collection === 'collectionMetadata') {
            previewPath = `/${locale}/collections/${handle}`;
        } else {
            previewPath = `/${locale}`;
        }
    }

    const base = storefrontBaseUrl.replace(/\/$/, '');
    const params = new URLSearchParams({ preview: '1' });
    if (previewSecret) {
        params.set('secret', previewSecret);
    }

    return `${base}/__by-tenant/${tenantId}${previewPath}?${params.toString()}`;
}

/**
 * Live-preview pane for Payload CMS document edit pages.
 *
 * Renders a collapsible iframe panel with a refresh button. Hidden by default —
 * the user opens it via "Show preview". The open/closed state persists in
 * `localStorage` under `cms.live-preview.open`.
 *
 * **Cross-origin refresh:** the storefront runs on a different port/domain than
 * the admin, so `contentWindow.location.reload()` would throw a `SecurityError`.
 * We use `iframe.src = iframe.src` instead, which forces a reload without
 * crossing the same-origin policy. This is a well-known workaround documented
 * in MDN's cross-origin iframe section.
 */
export function LivePreviewIframe({
    domain,
    target,
    locale = DEFAULT_LOCALE,
    defaultOpen = false,
    storefrontBaseUrl,
    previewSecret = '',
}: LivePreviewIframeProps) {
    // Initialise from localStorage (if available) — falls back to defaultOpen.
    const [isOpen, setIsOpen] = useState<boolean>(() => {
        if (typeof window === 'undefined') return defaultOpen;
        try {
            const stored = window.localStorage.getItem(STORAGE_KEY);
            if (stored !== null) return stored === 'true';
        } catch {
            // localStorage may be blocked (private browsing, security policy).
        }
        return defaultOpen;
    });

    // Keep localStorage in sync whenever the user toggles.
    useEffect(() => {
        try {
            window.localStorage.setItem(STORAGE_KEY, String(isOpen));
        } catch {
            // Silently ignore — storage might be disabled.
        }
    }, [isOpen]);

    const iframeRef = useRef<HTMLIFrameElement>(null);

    const previewUrl = buildPreviewUrl({
        storefrontBaseUrl,
        tenantId: domain,
        target,
        locale,
        previewSecret,
    });

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
