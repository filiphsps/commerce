'use client';

import { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import type { OnlineShop } from '@nordcom/commerce-db';

import { Trackable } from '@/utils/trackable';
//import { useReportWebVitals } from 'next/web-vitals';
import { GoogleTagManager } from '@next/third-parties/google';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

import type { ReactNode } from 'react';

export type AnalyticsProviderProps = {
    shop: OnlineShop;
    children: ReactNode;
};
export const AnalyticsProvider = ({ shop, children }: AnalyticsProviderProps) => {
    const [deferred, setDeferred] = useState<ReactNode>(null);

    const trackers = () => (
        <>
            {shop.thirdParty?.googleTagManager ? <GoogleTagManager gtmId={shop.thirdParty!.googleTagManager!} /> : null}
            <VercelAnalytics debug={false} />
        </>
    );
    useEffect(() => {
        const timeout = setTimeout(() => {
            setDeferred(trackers);
        }, 6750);

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
