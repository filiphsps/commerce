'use client';

import { BuildNotifier, BuildNotifierProvider } from 'next-build-notifier';
import type { CSSProperties, ReactNode } from 'react';

/**
 * Trims a full build id to 7 characters — enough to distinguish deployments without cluttering the
 * banner. Falls back to the full string for ids shorter than 7 characters.
 *
 * @param id - The raw build id string (e.g. a full git SHA or Vercel deployment id).
 * @returns The first 7 characters of `id`.
 */
function shortId(id: string): string {
    return id.slice(0, 7);
}

/**
 * Fixed bottom-right banner shown whenever the running admin client is behind the server's current
 * build. Uses Tailwind + CSS custom properties aligned to the admin token contract; no additional
 * runtime dependencies.
 *
 * The entrance slide animates only when the user has not requested reduced motion
 * (`@media (prefers-reduced-motion: no-preference)`). Safe-area insets are applied so the banner
 * avoids home-indicator bars on mobile devices.
 *
 * @param props.currentBuildId - The build id baked into this client at build time.
 * @param props.latestBuildId - The latest build id observed from the server.
 * @param props.onReload - Called when the operator clicks the reload button.
 * @param props.onDismiss - Called when the operator clicks the dismiss button.
 * @returns The positioned banner element.
 */
function AdminBuildNotifierBanner({
    currentBuildId,
    latestBuildId,
    onReload,
    onDismiss,
}: {
    currentBuildId: string;
    latestBuildId: string;
    onReload: () => void;
    onDismiss: () => void;
}): ReactNode {
    return (
        <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="fixed right-4 bottom-4 z-50 [padding-bottom:env(safe-area-inset-bottom,0px)] motion-safe:animate-[nbn-in-bottom_240ms_cubic-bezier(0.22,1,0.36,1)_both]"
        >
            <div className="flex w-72 flex-col gap-3 rounded-xl border-3 border-border border-solid bg-card/95 p-4 shadow-xl backdrop-blur-sm">
                {/* Status dot */}
                <div className="flex items-start gap-3">
                    <span
                        className="mt-0.5 flex size-2 shrink-0 rounded-full bg-primary motion-safe:animate-[nbn-ring_600ms_cubic-bezier(0,0,0.2,1)_both]"
                        style={{ '--nbn-ring-color': 'hsl(var(--primary))' } as CSSProperties}
                        aria-hidden="true"
                    />
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <p className="font-semibold text-foreground text-sm leading-tight">New build deployed</p>
                        <p className="font-mono text-muted-foreground text-xs leading-snug">
                            {shortId(currentBuildId)} → {shortId(latestBuildId)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onReload}
                        className="flex-1 rounded-lg bg-primary px-3 py-1.5 font-semibold text-primary-foreground text-xs transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                        Reload
                    </button>
                    <button
                        type="button"
                        onClick={onDismiss}
                        aria-label="Dismiss update notification"
                        className="flex size-7 items-center justify-center rounded-lg border-3 border-border border-solid text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                        <svg
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 14 14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M1 1l12 12M13 1L1 13" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Admin build notifier: drives the headless `next-build-notifier` engine and renders the admin-themed
 * banner when a newer build is deployed. Inert in development (`currentBuildId` is `'development'`).
 *
 * Mount once as the last child inside `<Providers>` in the root admin shell layout.
 *
 * @returns The provider + render-prop tree; inert in dev or when no update is available.
 */
export function AdminBuildNotifier(): ReactNode {
    return (
        <BuildNotifierProvider currentBuildId={process.env.NEXT_PUBLIC_BUILD_ID ?? 'development'} intervalMs={60_000}>
            <BuildNotifier>
                {(state) =>
                    state.updateAvailable && !state.dismissed && state.latestBuildId ? (
                        <AdminBuildNotifierBanner
                            currentBuildId={state.currentBuildId}
                            latestBuildId={state.latestBuildId}
                            onReload={state.reload}
                            onDismiss={state.dismiss}
                        />
                    ) : null
                }
            </BuildNotifier>
        </BuildNotifierProvider>
    );
}

AdminBuildNotifier.displayName = 'Nordcom.AdminBuildNotifier';
