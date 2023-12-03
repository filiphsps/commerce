'use client';

import { Trackable } from '@/utils/trackable';
import type { ReactNode } from 'react';
//import { useTrackable } from '@/utils/trackable';
//import { useReportWebVitals } from 'next/web-vitals';

export type AnalyticsProviderProps = {
    children: ReactNode;
};
export const AnalyticsProvider = ({ children }: AnalyticsProviderProps) => {
    //const trackable = useTrackable();

    /*useReportWebVitals(({ id, name, value }) => {
        trackable.queueEvent('web_vital', {
            gtm: {
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
            }
        });
    });*/

    return <Trackable>{children}</Trackable>;
};
