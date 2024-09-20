'use client';

import { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import type { OnlineShop } from '@nordcom/commerce-db';

import { BuildConfig } from '@/utils/build-config';
import { isCrawler } from '@/utils/is-crawler';
import { Trackable } from '@/utils/trackable';
import { GoogleTagManager } from '@next/third-parties/google';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

import type { ReactNode } from 'react';

export type AnalyticsProviderProps = {
    shop: OnlineShop;
    children: ReactNode;
    enableThirdParty?: boolean;
};
export const AnalyticsProvider = ({ shop, children, enableThirdParty = true }: AnalyticsProviderProps) => {
    const vercelAnalyticsMode = BuildConfig.environment !== 'test' ? BuildConfig.environment : 'auto';

    const [deferred, setDeferred] = useState<ReactNode>(null);
    const trackers = () => (
        <>
            {shop.thirdParty?.googleTagManager ? <GoogleTagManager gtmId={shop.thirdParty!.googleTagManager!} /> : null}
            <VercelAnalytics mode={vercelAnalyticsMode} debug={vercelAnalyticsMode === 'development'} />
        </>
    );

    useEffect(() => {
        if (isCrawler(window.navigator.userAgent)) {
            return undefined;
        }

        const { signal, abort } = new AbortController();
        document.addEventListener(
            'readystatechange',
            (event) => {
                const target = event.target as Document | null;
                if (!target || target.readyState !== 'complete') {
                    return;
                }

                // Add a small delay to improve our lighthouse score.
                setTimeout(() => {
                    setDeferred(trackers);
                    abort('readyState changed to `complete`');
                }, 100);
            },
            { signal }
        );

        return () => abort('useEffect cleanup');
    }, []);

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
