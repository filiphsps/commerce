'use client';

import { useEffect, useMemo, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import type { OnlineShop } from '@nordcom/commerce-db';

import { BuildConfig } from '@/utils/build-config';
import { isCrawler } from '@/utils/is-crawler';
import { isPreviewEnv } from '@/utils/is-preview-env';
import { Trackable } from '@/utils/trackable';
import { GoogleTagManager } from '@next/third-parties/google';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

import type { ReactNode } from 'react';

export type AnalyticsProviderProps = {
    shop: OnlineShop;
    hostname?: string;
    children: ReactNode;
    enableThirdParty?: boolean;
};
export const AnalyticsProvider = ({ shop, hostname, children, enableThirdParty = true }: AnalyticsProviderProps) => {
    const vercelAnalyticsMode = BuildConfig.environment !== 'test' ? BuildConfig.environment : 'auto';

    const [deferred, setDeferred] = useState<ReactNode>(null);
    const trackers = useMemo(
        () => (
            <>
                {shop.thirdParty?.googleTagManager ? (
                    <GoogleTagManager gtmId={shop.thirdParty.googleTagManager!} />
                ) : null}
                <VercelAnalytics mode={vercelAnalyticsMode} debug={vercelAnalyticsMode === 'development'} />
            </>
        ),
        [shop, vercelAnalyticsMode]
    );

    useEffect(() => {
        if (isPreviewEnv(hostname) || isCrawler(window.navigator.userAgent)) {
            return undefined;
        }

        const timeout = setTimeout(() => {
            setDeferred(trackers);
        }, 6500);
        return () => clearTimeout(timeout);
    }, [hostname, trackers]);

    return (
        <ErrorBoundary fallbackRender={() => children as any}>
            <Trackable>{children as any}</Trackable>

            {enableThirdParty ? (
                <>
                    <SpeedInsights debug={false} />
                    {deferred}
                </>
            ) : null}
        </ErrorBoundary>
    );
};
