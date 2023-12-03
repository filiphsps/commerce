'use client';

import type { Shop, ShopifyCommerceProvider } from '@/api/shop';
import { useShop } from '@/components/shop/provider';
import type { Nullable } from '@/utils/abstract-api';
import { MissingContextProviderError } from '@/utils/errors';
import type { CurrencyCode } from '@/utils/locale';
import { Locale } from '@/utils/locale';
import type { ShopifyPageViewPayload } from '@shopify/hydrogen-react';
import {
    AnalyticsEventName as ShopifyAnalyticsEventName,
    ShopifySalesChannel,
    getClientBrowserParameters,
    sendShopifyAnalytics,
    useShop as useShopify
} from '@shopify/hydrogen-react';
import type { ShopifyContextValue } from '@shopify/hydrogen-react/dist/types/ShopifyProvider';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

/**
 * Analytics events.
 *
 * @todo TODO: Support custom events.
 */
export type AnalyticsEventType =
    | 'web_vital'
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
export type AnalyticsEventData = {
    path?: Nullable<string>;
    gtm?: {
        [key: string]: any;
    };
};

/**
 * @see {@link https://shopify.dev/docs/api/hydrogen-react/2023-10/utilities/sendshopifyanalytics#analyticspagetype}
 */
export type ShopifyPageType =
    | 'article'
    | 'blog'
    | 'captcha'
    | 'cart'
    | 'collection'
    | 'customers/account'
    | 'customers/activate_account'
    | 'customers/addresses'
    | 'customer/login'
    | 'customers/order'
    | 'customers/register'
    | 'customers/reset_password'
    | 'gift_card'
    | 'index'
    | 'list-collections'
    | '403'
    | '404'
    | 'page'
    | 'password'
    | 'product'
    | 'policy'
    | 'search';

// TODO: Move this to a generic utility.
const pathToShopifyPageType = (pathName: string): ShopifyPageType => {
    let path = pathName;

    // Remove locale prefix if it exists using regex.
    path = path.replace(/^\/[a-z]{2}-[a-z]{2}\//, '');

    switch (true) {
        case /^\/$/.test(path):
            return 'index';
        case /^\/blogs\/[a-z0-9-]+\/articles\/[a-z0-9-]+$/.test(path):
            return 'article';
        case /^\/blogs\/[a-z0-9-]+$/.test(path):
            return 'blog';
        case /^\/cart$/.test(path):
            return 'cart';
        case /^\/collections\/[a-z0-9-]+$/.test(path):
            return 'collection';
        case /^\/account\/addresses$/.test(path):
            return 'customers/addresses';
        case /^\/account\/login$/.test(path):
            return 'customer/login';
        case /^\/account\/orders\/[a-z0-9-]+$/.test(path):
            return 'customers/order';
        case /^\/account\/register$/.test(path):
            return 'customers/register';
        case /^\/account\/reset_password$/.test(path):
            return 'customers/reset_password';
        case /^\/gift_cards\/[a-z0-9-]+$/.test(path):
            return 'gift_card';
        case /^\/products\/[a-z0-9-]+$/.test(path):
            return 'product';
        case /^\/policies\/[a-z0-9-]+$/.test(path):
            return 'policy';
        case /^\/search$/.test(path):
            return 'search';
        default:
            return 'page';
    }
};

export type AnalyticsEventActionProps = {
    shop: Shop;
    currency: CurrencyCode;
    shopify: ShopifyContextValue;
};

const shopifyEventHandler = async (
    event: AnalyticsEventType,
    data: AnalyticsEventData,
    { shop, currency, shopify }: AnalyticsEventActionProps
) => {
    // Shopify only supports a subset of events.
    if (event !== 'page_view' && event !== 'add_to_cart') {
        return;
    } else if (shop.configuration.commerce.type !== 'shopify') {
        console.error('shopifyEventHandler() called for non-Shopify shop.');
        return;
    }

    const commerce = shop.configuration.commerce as ShopifyCommerceProvider;
    const pageType = pathToShopifyPageType(data.path!);

    const pageAnalytics = {
        canonicalUrl: '',
        resourceId: '',
        pageType
    };

    const sharedPayload: ShopifyPageViewPayload = {
        shopifySalesChannel: ShopifySalesChannel.hydrogen,
        shopId: `gid://shopify/Shop/${commerce.id}`,
        storefrontId: shopify.storefrontId,
        currency: currency,
        acceptedLanguage: Locale.current.language,
        hasUserConsent: true, // TODO: Cookie consent.
        ...pageAnalytics,
        ...getClientBrowserParameters(),
        path: data.path!.replace(/^\/[a-z]{2}-[a-z]{2}\//, ''),
        navigationType: 'navigate' // TODO: do this properly.
    };

    try {
        switch (event) {
            case 'page_view': {
                // FIXME: We can't actually capture the error here. Make a PR upstream to fix this.
                await sendShopifyAnalytics(
                    {
                        eventName: ShopifyAnalyticsEventName.PAGE_VIEW,
                        payload: {
                            ...sharedPayload
                        }
                    },
                    commerce.domain
                );
                break;
            }
            case 'add_to_cart': {
                console.warn('TODO: shopify/add_to_cart', data);
                break;
            }
        }
    } catch (error: unknown) {
        console.error(error);
    }
};

const postEvent = async (
    event: AnalyticsEventType,
    data: AnalyticsEventData,
    { shop, currency, shopify }: AnalyticsEventActionProps
) => {
    if (!window.dataLayer) {
        console.warn('window.dataLayer not found, creating it.');
        window.dataLayer = [];
    }

    switch (shop.configuration.commerce.type) {
        case 'shopify': {
            await shopifyEventHandler(event, data, { shop, currency, shopify });
        }
    }

    let additionalData = {};
    switch (event) {
        case 'web_vital':
        case 'exception':
            additionalData = {
                ...additionalData,
                non_interaction: true // Avoids affecting bounce rate.
            };
    }

    window.dataLayer.push({
        event,
        ...additionalData,
        ...(data.gtm || {})
    });

    if (typeof data.gtm?.ecommerce !== 'undefined') {
        window.dataLayer.push({
            // Get the dataLayer ready for the next event.
            ecommerce: null
        });
    }
};

type TrackableContextReturns = {
    /**
     * Adds an event to the queue to be sent to the analytics provider.
     *
     * This is the safer option as it will wait for all providers to be ready.
     */
    queueEvent: (type: AnalyticsEventType, data: AnalyticsEventData) => void;

    /**
     * Send the event immediately.
     *
     * This is the faster option but may fail if the analytics provider is not ready.
     * In most cases {@link TrackableContextReturns.queueEvent} should be used instead.
     */
    postEvent: (type: AnalyticsEventType, data: AnalyticsEventData) => Promise<void>;
};

export interface TrackableContextValue extends TrackableContextReturns {}
export const TrackableContext = createContext<TrackableContextValue | null>(null);

export type TrackableProps = {
    children: ReactNode;
};
export function Trackable({ children }: TrackableProps) {
    const path = usePathname();
    const { shop, currency } = useShop();
    const shopify = useShopify();

    const [queue, setQueue] = useState<
        {
            type: AnalyticsEventType;
            event: AnalyticsEventData;
        }[]
    >([]);

    const queueEvent = useCallback((type: AnalyticsEventType, event: AnalyticsEventData) => {
        setQueue((queue) => [...queue, { type, event }]);
        return;
    }, []);

    // Page view.
    useEffect(() => {
        queueEvent('page_view', { path });
    }, [path]);

    // Send events.
    useEffect(() => {
        if (!shop || !currency || !queue || queue.length <= 0) return;

        console.debug(`Sending ${queue.length} event(s): ${queue.map(({ type }) => type).join(', ')}.`);

        // Clone the queue, as it may be modified while we are sending events.
        let events = [...queue];

        // Clear queue to prevent duplicate events.
        setQueue(() => []);

        // TODO: Handle this properly.
        if (events.length === 2 && events[0].type === 'page_view' && events[1].type === 'page_view') {
            events.pop();
        }

        // Flush the queue.
        Promise.allSettled(
            events.map(({ type, event }) => {
                return postEvent(
                    type,
                    {
                        ...event,
                        path: event.path || path
                    },
                    { shop, currency, shopify }
                );
            })
        ).then((results) => {
            const failed = results.filter((result) => result.status === 'rejected');

            if (failed.length > 0) {
                console.error('Failed to send analytics events:', failed);
            }
        });
    }, [shop, currency, queue]);

    return (
        <TrackableContext.Provider
            value={{
                queueEvent,
                postEvent: async (type, event) => {
                    return postEvent(type, event, { shop, currency, shopify });
                }
            }}
        >
            {children}
        </TrackableContext.Provider>
    );
}

/**
 * Provides access to the {@link TrackableContext}.
 * Must be a descendant of {@link Trackable}.
 *
 * @returns {TrackableContextValue} The trackable context.
 */
export const useTrackable = (): TrackableContextValue => {
    const context = useContext(TrackableContext);
    if (!context) {
        throw new MissingContextProviderError('useTrackable', 'Trackable');
    }

    return context;
};
