'use client';

import type { Shop } from '@/api/shop';
import { Trackable } from '@/utils/trackable';
import { useEffect, useState, type ReactNode } from 'react';
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
    useEffect(() => {
        const timeout = setTimeout(() => {
            setDeferred(
                <>
                    {shop?.thirdParty?.googleTagManager ? (
                        <GoogleTagManager gtmId={shop.thirdParty!.googleTagManager!} />
                    ) : null}
                    <VercelAnalytics debug={false} />
                </>
            );
        }, 6750);

        () => clearTimeout(timeout);
    }, []);

    return (
        <>
            <SpeedInsights debug={false} />
            <Trackable>{children}</Trackable>
            {deferred}
        </>
    );
};
