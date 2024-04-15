'use client';

import { type ReactNode, useEffect, useState } from 'react';

import type { Shop } from '@nordcom/commerce-database';

import { Trackable } from '@/utils/trackable';
//import { useReportWebVitals } from 'next/web-vitals';
import { GoogleTagManager } from '@next/third-parties/google';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export type AnalyticsProviderProps = {
    shop: Shop;
    children: ReactNode;
};
export const AnalyticsProvider = ({ shop, children }: AnalyticsProviderProps) => {
    const [deferred, setDeferred] = useState<any>(null);

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
        <>
            <SpeedInsights debug={false} />
            <Trackable>{children}</Trackable>
            {deferred}
        </>
    );
};
