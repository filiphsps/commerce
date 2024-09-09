'use client';

import { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import type { OnlineShop } from '@nordcom/commerce-db';

import { BuildConfig } from '@/utils/build-config';
import { Trackable } from '@/utils/trackable';
import { GoogleTagManager } from '@next/third-parties/google';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

import type { ReactNode } from 'react';

export type AnalyticsProviderProps = {
    shop: OnlineShop;
    children: ReactNode;
};
export const AnalyticsProvider = ({ shop, children }: AnalyticsProviderProps) => {
    const mode = BuildConfig.environment !== 'test' ? BuildConfig.environment : 'auto';

    const [deferred, setDeferred] = useState<ReactNode>(null);
    const trackers = () => (
        <>
            {shop.thirdParty?.googleTagManager ? <GoogleTagManager gtmId={shop.thirdParty!.googleTagManager!} /> : null}
            <VercelAnalytics mode={mode} debug={mode === 'development'} />
        </>
    );
    useEffect(() => {
        const timeout = setTimeout(() => {
            setDeferred(trackers);
        }, 3500);

        return () => clearTimeout(timeout);
    }, []);

    return (
        <ErrorBoundary fallbackRender={() => null}>
            <Trackable>{children}</Trackable>
            <SpeedInsights debug={false} />

            {deferred}
        </ErrorBoundary>
    );
};
