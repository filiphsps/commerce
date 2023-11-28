'use client';

import type { Shop } from '@/api/shop';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useCartUtils } from '@/hooks/useCartUtils';
import type { Locale } from '@/utils/locale';
import { GoogleTagManager, sendGTMEvent } from '@next/third-parties/google';
import { useReportWebVitals } from 'next/web-vitals';
import { useEffect, useState, type ReactNode } from 'react';

type AnalyticsProvider = {
    shop: Shop;
    locale: Locale;
    children: ReactNode;
};
export const AnalyticsProvider = ({ shop, locale, children }: AnalyticsProvider) => {
    const [afterLoad, setAfterLoad] = useState<ReactNode>(null);
    useEffect(() => {
        if (!shop?.configuration?.thirdParty?.googleTagManager) {
            return;
        }

        const timeout = setTimeout(() => {
            if (afterLoad || !shop?.configuration?.thirdParty?.googleTagManager) {
                return;
            }

            setAfterLoad(() => (
                <>
                    <GoogleTagManager gtmId={shop.configuration.thirdParty.googleTagManager!} />
                </>
            ));

            // Wait 5.75 seconds to prevent tag manager from destroying our ranking.
        }, 5_750);

        return () => clearTimeout(timeout);
    }, []);

    useAnalytics({
        locale,
        shop,
        pagePropsAnalyticsData: {}
    });

    useCartUtils({
        locale
    });

    useReportWebVitals(({ id, name, value }) => {
        if (!window.dataLayer) return;
        sendGTMEvent({
            event: 'web-vital',
            event_category: 'Web Vitals',
            event_action: name,
            // Google Analytics metrics must be integers, so the value is rounded.
            // For CLS the value is first multiplied by 1000 for greater precision
            // (note: increase the multiplier for greater precision if needed).
            event_value: Math.round(name === 'CLS' ? value * 1000 : value),
            // The 'id' value will be unique to the current page load. When sending
            // multiple values from the same page (e.g. for CLS), Google Analytics can
            // compute a total by grouping on this ID (note: requires `eventLabel` to
            // be a dimension in your report).
            event_label: id
        });
    });

    return (
        <>
            {children}
            {afterLoad}
        </>
    );
};
