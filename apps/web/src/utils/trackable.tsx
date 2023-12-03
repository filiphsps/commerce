'use client';

import type { Shop } from '@/api/shop';
import { useShop } from '@/components/shop/provider';
import type { ShopifyPageViewPayload } from '@shopify/hydrogen-react';
import {
    AnalyticsEventName as ShopifyAnalyticsEventName,
    ShopifySalesChannel,
    getClientBrowserParameters,
    sendShopifyAnalytics,
    useShop as useShopify
} from '@shopify/hydrogen-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { CurrencyCode } from './locale';
import { Locale } from './locale';

export type AnalyticsEventType =
    | 'page_view'
    | 'view_items'
    | 'view_item_list'
    | 'view_cart'
    | 'add_to_cart'
    | 'remove_from_cart'
    | 'begin_checkout'
    | 'purchase'
    | 'refund'
    | 'search'
    | 'login'
    | 'sign_up'
    | 'exception'
    | 'view_promotion'
    | 'add_payment_info'
    | 'add_shipping_info';
export type AnalyticsEventData = any;

function shopifyEventHandler(
    event: AnalyticsEventType,
    data: AnalyticsEventData,
    { shop, currency }: { shop: Shop; currency: CurrencyCode }
) {
    // Shopify only supports a subset of events.
    if (event !== 'page_view' && event !== 'add_to_cart') return;
    else if (shop.configuration.commerce.type !== 'shopify') return;

    const shopify = useShopify();

    const pageAnalytics = {
        canonicalUrl: '',
        resourceId: '',
        /**
         * @see {@link https://shopify.dev/docs/api/hydrogen-react/2023-10/utilities/sendshopifyanalytics#analyticspagetype}
         */
        pageType: 'index'
    };

    const sharedPayload: ShopifyPageViewPayload = {
        shopifySalesChannel: ShopifySalesChannel.hydrogen,
        shopId: shop.configuration.commerce.id,
        storefrontId: shopify.storefrontId,
        currency: currency,
        acceptedLanguage: Locale.current.language,
        hasUserConsent: true, // TODO
        ...getClientBrowserParameters(),
        ...pageAnalytics
    };

    switch (event) {
        case 'page_view': {
            sendShopifyAnalytics(
                {
                    eventName: ShopifyAnalyticsEventName.PAGE_VIEW,
                    payload: {
                        ...sharedPayload
                    }
                },
                shop.domains.primary
            );
            break;
        }
        case 'add_to_cart': {
            console.log('add_to_cart', data);
            break;
        }
    }
}

export const postEvent = (
    event: AnalyticsEventType,
    data: AnalyticsEventData,
    { shop, currency }: { shop: Shop; currency: CurrencyCode }
) => {
    if (typeof window === 'undefined') {
        // TODO: Initial state from SSR?
        console.error('postEvent() called from server environment.');
        return;
    }
    if (!window.dataLayer) {
        window.dataLayer = [];
    }

    switch (shop.configuration.commerce.type) {
        case 'shopify': {
            shopifyEventHandler(event, data, { shop, currency });
        }
    }

    window.dataLayer.push({
        event,
        ...data
    });
};

export type TrackableProps = {};
export function Trackable({}: TrackableProps) {
    const path = usePathname();
    const { shop, currency } = useShop();

    const [queue, setQueue] = useState<
        {
            event: AnalyticsEventType;
            data: AnalyticsEventData;
        }[]
    >([]);

    // Page view.
    useEffect(() => {
        setQueue((queue) => [...queue, { event: 'page_view', data: {} }]);
    }, [, path]);

    useEffect(() => {
        if (!shop || !currency || !queue || queue.length <= 0) return;

        // Flush queue.
        setQueue((queue) => {
            queue.forEach(({ event, data }) => {
                postEvent(event, data, { shop, currency });
            });
            return [];
        });
    }, [shop, currency, queue]);

    return <></>;
}
