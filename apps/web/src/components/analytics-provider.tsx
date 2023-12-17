'use client';

import type { Shop } from '@/api/shop';
import { Trackable } from '@/utils/trackable';
import type { ReactNode } from 'react';
//import { useReportWebVitals } from 'next/web-vitals';
import { GoogleTagManager } from '@next/third-parties/google';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export type AnalyticsProviderProps = {
    shop: Shop;
    children: ReactNode;
};
export const AnalyticsProvider = ({ shop, children }: AnalyticsProviderProps) => {
    return (
        <>
            {shop?.configuration?.thirdParty?.googleTagManager ? (
                <GoogleTagManager gtmId={shop!.configuration!.thirdParty!.googleTagManager!} />
            ) : null}
            <Trackable>{children}</Trackable>;
            <VercelAnalytics debug={false} />
            <SpeedInsights debug={false} />
        </>
    );
};
