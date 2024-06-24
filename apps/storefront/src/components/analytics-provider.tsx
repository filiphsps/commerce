import type { Shop } from '@nordcom/commerce-database';

import { Trackable } from '@/utils/trackable';
//import { useReportWebVitals } from 'next/web-vitals';
import { GoogleTagManager } from '@next/third-parties/google';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

import type { ReactNode } from 'react';

export type AnalyticsProviderProps = {
    shop: Shop;
    children: ReactNode;
};
export const AnalyticsProvider = ({ shop, children }: AnalyticsProviderProps) => {
    return (
        <>
            <Trackable>{children}</Trackable>
            {shop.thirdParty?.googleTagManager ? <GoogleTagManager gtmId={shop.thirdParty!.googleTagManager!} /> : null}
            <VercelAnalytics debug={false} />
            <SpeedInsights debug={false} />
        </>
    );
};
