'use client';

import { GoogleTagManager } from '@next/third-parties/google';
import type { OnlineShop } from '@nordcom/commerce-db';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { BuildConfig } from '@/utils/build-config';
import { isCrawler } from '@/utils/is-crawler';
import { isPreviewEnv } from '@/utils/is-preview-env';
import { Trackable } from '@/utils/trackable';

export type AnalyticsProviderProps = {
    shop: OnlineShop;
    hostname?: string;
    children: ReactNode;
    enableThirdParty?: boolean;
};
/**
 * Wraps children with Vercel Analytics, Speed Insights, and optional third-party
 * scripts (Google Tag Manager) deferred by 6.5 s to avoid blocking the critical path.
 *
 * @param props.shop - Shop record used to resolve third-party integration IDs.
 * @param props.hostname - Request hostname; preview environments and crawlers suppress third-party scripts.
 * @param props.children - Component subtree to wrap.
 * @param props.enableThirdParty - Opt out of third-party scripts entirely when `false`.
 * @returns The wrapped subtree inside an error boundary.
 */
export const AnalyticsProvider = ({ shop, hostname, children, enableThirdParty = true }: AnalyticsProviderProps) => {
    const vercelAnalyticsMode = BuildConfig.environment !== 'test' ? BuildConfig.environment : 'auto';

    const [deferred, setDeferred] = useState<ReactNode>(null);

    useEffect(() => {
        if (isPreviewEnv(hostname) || isCrawler(window.navigator.userAgent)) {
            return undefined;
        }

        const timeout = setTimeout(() => {
            setDeferred(() => (
                <>
                    {shop.thirdParty?.googleTagManager ? (
                        <GoogleTagManager gtmId={shop.thirdParty.googleTagManager!} />
                    ) : null}
                    <VercelAnalytics mode={vercelAnalyticsMode} debug={vercelAnalyticsMode === 'development'} />
                </>
            ));
        }, 6500);
        return () => clearTimeout(timeout);
    }, [hostname, shop.thirdParty?.googleTagManager, vercelAnalyticsMode]);

    return (
        <ErrorBoundary fallbackRender={() => children}>
            <Trackable>{children}</Trackable>

            {enableThirdParty ? (
                <>
                    <SpeedInsights debug={false} />
                    {deferred}
                </>
            ) : null}
        </ErrorBoundary>
    );
};
