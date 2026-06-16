'use client';

import { BuildNotifier, BuildNotifierProvider } from 'next-build-notifier';
import type { ReactNode } from 'react';

/**
 * Inner banner rendered when a newer build is available. Uses the landing site's Tailwind token
 * contract (`--color-brand`, `--color-background`, `--color-foreground`, etc.) and safe-area insets
 * for mobile. Entrance slides up from the bottom with `nbn-in-bottom`; the accent dot pulses with
 * `nbn-ring` (both defined in `globals.css`); both animations respect `prefers-reduced-motion`.
 *
 * @param props.onReload - Reloads the page to pick up the new build.
 * @param props.onDismiss - Dismisses the banner without reloading.
 * @returns The positioned banner element.
 */
function LandingBuildNotifierBanner({
    onReload,
    onDismiss,
}: {
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
            <div className="flex w-72 flex-col gap-3 rounded-xl border border-border border-solid bg-background/95 p-4 shadow-xl backdrop-blur-sm">
                {/* Accent dot + message */}
                <div className="flex items-start gap-3">
                    <span
                        className="mt-0.5 flex size-2 shrink-0 rounded-full bg-brand motion-safe:animate-[nbn-ring_600ms_cubic-bezier(0,0,0.2,1)_both]"
                        aria-hidden="true"
                    />
                    <p className="font-semibold text-foreground text-sm leading-snug">We shipped an update</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onReload}
                        className="flex-1 rounded-lg bg-brand px-3 py-1.5 font-semibold text-brand-foreground text-xs transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                        Reload
                    </button>
                    <button
                        type="button"
                        onClick={onDismiss}
                        aria-label="Dismiss update notification"
                        className="flex size-7 items-center justify-center rounded-lg border border-border border-solid text-muted-foreground transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
 * Landing "we shipped an update" banner. Drives the headless `next-build-notifier` engine and
 * renders the marketing-site-themed banner when a newer build is deployed. Inert during development
 * when `NEXT_PUBLIC_BUILD_ID` is not set.
 *
 * Mount once as the last child inside `<Providers>` in each route-group layout.
 *
 * @returns The provider + render-prop tree; inert in dev or when no update is available.
 */
export function LandingBuildNotifier(): ReactNode {
    return (
        <BuildNotifierProvider currentBuildId={process.env.NEXT_PUBLIC_BUILD_ID ?? 'development'} intervalMs={60_000}>
            <BuildNotifier>
                {(state) =>
                    state.updateAvailable && !state.dismissed ? (
                        <LandingBuildNotifierBanner onReload={state.reload} onDismiss={state.dismiss} />
                    ) : null
                }
            </BuildNotifier>
        </BuildNotifierProvider>
    );
}

LandingBuildNotifier.displayName = 'Nordcom.LandingBuildNotifier';
