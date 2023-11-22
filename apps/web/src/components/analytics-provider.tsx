'use client';

import type { Shop } from '@/api/shop';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useCartUtils } from '@/hooks/useCartUtils';
import type { Locale } from '@/utils/locale';
import { type ReactNode } from 'react';

type AnalyticsProvider = {
    shop: Shop;
    locale: Locale;
    children: ReactNode;
};
export const AnalyticsProvider = ({ shop, locale, children }: AnalyticsProvider) => {
    useAnalytics({
        locale,
        shop,
        pagePropsAnalyticsData: {}
    });
    useCartUtils({
        locale
    });

    return <>{children}</>;
};
