import React, { FunctionComponent, useEffect } from 'react';

import { useRouter } from 'next/router';

interface ShopifyAnalyticsProps {}
const ShopifyAnalytics: FunctionComponent<ShopifyAnalyticsProps> = (props) => {
    const router = useRouter();

    useEffect(() => {
        let pageType = 'home';
        if (router.asPath.includes('products/')) pageType = 'product';
        if (router.asPath.includes('collections/')) pageType = 'collection';

        (window as any)?.ShopifyAnalytics?.lib?.page(null, {
            pageType,
            resourceType: pageType !== 'home' ? pageType : undefined,
            resourceId:
                pageType !== 'home' && (window as any).resourceId
                    ? (window as any).resourceId
                    : undefined
        });

        (window as any).resourceId = null;
    }, [router.asPath]);

    return <div className="ShopifyAnalytics"></div>;
};

export default ShopifyAnalytics;
