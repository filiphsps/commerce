'use client';

import type { CSSProperties, ReactNode } from 'react';

export type BuildNotifierBannerProps = {
    /** Whether the banner is pinned to `top` or `bottom` of the viewport. */
    position: 'top' | 'bottom';
    /** Localized display strings for the three visible text nodes. */
    labels: { title: string; reload: string; dismiss: string };
    /** When `true`, the dismiss button is rendered. */
    dismissable: boolean;
    /** Invoked when the visitor clicks the reload action. */
    onReload: () => void;
    /** Invoked when the visitor clicks the dismiss action. */
    onDismiss: () => void;
};

/**
 * Storefront-themed "new version available" banner — purely presentational.
 *
 * Colors derive from the shop's CSS custom properties so the banner respects
 * per-tenant branding without runtime JS. One-shot entrance animation is gated
 * behind `motion-safe` so visitors with reduced-motion preferences see no
 * animation. The accent status dot emits a single ring pulse under the same
 * gate. Safe-area insets are applied via `pb-safe`/`pt-safe` so the banner
 * avoids phone notches and home-indicator bars.
 *
 * @param props.position - Viewport edge the banner attaches to (`top` or `bottom`).
 * @param props.labels - Localized title, reload, and dismiss strings.
 * @param props.dismissable - Controls whether the dismiss button is rendered.
 * @param props.onReload - Called when the visitor activates the reload button.
 * @param props.onDismiss - Called when the visitor activates the dismiss button.
 * @returns The positioned, themed banner element.
 */
export function BuildNotifierBanner({
    position,
    labels,
    dismissable,
    onReload,
    onDismiss,
}: BuildNotifierBannerProps): ReactNode {
    const isBottom = position === 'bottom';

    return (
        <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className={[
                'fixed inset-x-0 z-50 flex justify-center px-4',
                isBottom
                    ? 'pb-[max(1rem,env(safe-area-inset-bottom))] bottom-0'
                    : 'top-0 pt-[max(1rem,env(safe-area-inset-top))]',
                isBottom
                    ? 'motion-safe:animate-[nbn-in-bottom_240ms_cubic-bezier(0.22,1,0.36,1)_both]'
                    : 'motion-safe:animate-[nbn-in-top_240ms_cubic-bezier(0.22,1,0.36,1)_both]',
            ].join(' ')}
        >
            <div className="flex w-full max-w-sm items-center gap-3 rounded-xl border border-(--border-default) bg-(--surface-1) px-4 py-3 shadow-lg">
                {/* Accent status dot with a one-shot ring pulse under motion-safe. */}
                <span
                    className="relative flex size-2.5 shrink-0 motion-safe:animate-[nbn-ring_600ms_cubic-bezier(0,0,0.2,1)_both]"
                    style={{ '--nbn-ring-color': 'var(--accent)' } as CSSProperties}
                    aria-hidden="true"
                >
                    <span className="block size-2.5 rounded-full bg-(--accent)" />
                </span>

                <p className="flex-1 text-(--text) text-sm leading-snug">{labels.title}</p>

                <div className="flex shrink-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={onReload}
                        className="rounded-md bg-(--accent) px-3 py-1.5 font-semibold text-(--color-primary-foreground) text-xs transition-opacity hover:opacity-90 focus-visible:outline-(--accent) focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                        {labels.reload}
                    </button>

                    {dismissable && (
                        <button
                            type="button"
                            onClick={onDismiss}
                            aria-label={labels.dismiss}
                            className="flex size-6 items-center justify-center rounded-md text-(--text-muted) transition-colors hover:text-(--text) focus-visible:outline-(--accent) focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                            <svg
                                aria-hidden="true"
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
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
                    )}
                </div>
            </div>
        </div>
    );
}

BuildNotifierBanner.displayName = 'Nordcom.BuildNotifierBanner';
