'use client';

import { BuildNotifier, BuildNotifierProvider } from 'next-build-notifier';
import type { ReactNode } from 'react';
import { BuildNotifierBanner } from './build-notifier-banner';

export type StorefrontBuildNotifierProps = {
    /** Master switch — when `false` the provider is rendered but the engine never polls. */
    enabled: boolean;
    /** Viewport edge the banner attaches to. */
    position: 'top' | 'bottom';
    /** Hard-reload the page automatically on first update detection when `true`. */
    autoReload: boolean;
    /** Expose a dismiss action on the banner when `true`. */
    dismissable: boolean;
    /** Localized or CMS-overridden display strings. */
    labels: { title: string; reload: string; dismiss: string };
};

/**
 * Storefront build notifier: drives the headless `next-build-notifier` package with the
 * resolved per-shop config and renders the themed banner when an update is available.
 *
 * The provider is inert in development because `next-build-notifier` never polls when
 * `currentBuildId` is `'development'`. The engine is also inert when `enabled` is `false`,
 * so this component is safe to mount unconditionally in the tenant layout.
 *
 * @param props.enabled - Whether polling and banner display are active for this shop.
 * @param props.position - Banner viewport edge (`top` or `bottom`).
 * @param props.autoReload - Whether the page reloads automatically on first update.
 * @param props.dismissable - Whether the visitor can dismiss the banner.
 * @param props.labels - Localized title, reload, and dismiss strings.
 * @returns The provider + headless render-prop tree; inert in dev and when disabled.
 */
export function StorefrontBuildNotifier({
    enabled,
    position,
    autoReload,
    dismissable,
    labels,
}: StorefrontBuildNotifierProps): ReactNode {
    return (
        <BuildNotifierProvider
            currentBuildId={process.env.NEXT_PUBLIC_BUILD_ID ?? 'development'}
            intervalMs={60_000}
            autoReload={autoReload}
            enabled={enabled}
        >
            <BuildNotifier>
                {(state) =>
                    state.updateAvailable && !(dismissable && state.dismissed) ? (
                        <BuildNotifierBanner
                            position={position}
                            labels={labels}
                            dismissable={dismissable}
                            onReload={state.reload}
                            onDismiss={state.dismiss}
                        />
                    ) : null
                }
            </BuildNotifier>
        </BuildNotifierProvider>
    );
}

StorefrontBuildNotifier.displayName = 'Nordcom.StorefrontBuildNotifier';
