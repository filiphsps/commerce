'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';

import type { Nullable, OnlineShop } from '@nordcom/commerce-db';
import { MissingContextProviderError, TodoError, UnknownCommerceProviderError } from '@nordcom/commerce-errors';

import { usePrevious } from '@/hooks/usePrevious';
import { BuildConfig } from '@/utils/build-config';
import { isCrawler } from '@/utils/is-crawler';
import { productToMerchantsCenterId } from '@/utils/merchants-center-id';
import { safeParseFloat } from '@/utils/pricing';
import {
    AnalyticsEventName as AnalyticsShopifyEventName,
    getClientBrowserParameters,
    sendShopifyAnalytics,
    ShopifySalesChannel,
    useCart,
    useShop as useShopify,
    useShopifyCookies
} from '@shopify/hydrogen-react';
import { track as vercelTrack } from '@vercel/analytics/react';
import debounce from 'lodash.debounce';
import { usePathname } from 'next/navigation';
import { createContext, useContext } from 'use-context-selector';

import { useShop } from '@/components/shop/provider';

import type { CurrencyCode, Locale } from '@/utils/locale';
import type { CartWithActions, ShopifyPageViewPayload } from '@shopify/hydrogen-react';
import type { ShopifyContextValue } from '@shopify/hydrogen-react/dist/types/ShopifyProvider';
import type { CartLine } from '@shopify/hydrogen-react/storefront-api-types';
import type { ReactNode } from 'react';

/**
 * Analytics events.
 *
 * @todo TODO: Support custom events.
 */
export type AnalyticsEventType =
    | 'web_vital'
    | 'page_view'
    | 'view_item'
    | 'view_item_list'
    | 'view_cart'
    | 'add_to_cart'
    | 'remove_from_cart'
    | 'begin_checkout'
    | 'purchase'
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
        ecommerce?: {
            [key: string]: any;
            currency?: string;
            value?: number;
            items?: {
                item_id: string;
                item_name?: string;
                item_brand?: string;
                item_category?: string;
                item_variant?: string;
                product_id?: string;
                variant_id?: string;
                sku?: string;
                price?: number;
                currency?: string;
                quantity?: number;
            }[];
        };
    };
};
export type AnalyticsEventConfig = {};

/**
 * @see {@link https://shopify.dev/docs/api/hydrogen-react/2024-07/utilities/sendshopifyanalytics#analyticspagetype}
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
const pathToShopifyPageType = (path: string): ShopifyPageType => {
    switch (true) {
        case /^\/$/.test(path):
            return 'index';
        case /^\/blogs\/[a-z0-9-]+\/articles\/[a-z0-9-]+\/$/.test(path):
            return 'article';
        case /^\/blogs\/[a-z0-9-]+\/$/.test(path):
            return 'blog';
        case /^\/cart\/$/.test(path):
            return 'cart';
        case /^\/collections\/[a-z0-9-]+\/$/.test(path):
            return 'collection';
        case /^\/account\/addresses\/$/.test(path):
            return 'customers/addresses';
        case /^\/account\/login\/$/.test(path):
            return 'customer/login';
        case /^\/account\/orders\/[a-z0-9-]+\/$/.test(path):
            return 'customers/order';
        case /^\/account\/register\/$/.test(path):
            return 'customers/register';
        case /^\/account\/reset_password\/$/.test(path):
            return 'customers/reset_password';
        case /^\/gift_cards\/[a-z0-9-]+\/$/.test(path):
            return 'gift_card';
        case /^\/products\/[a-z0-9-]+\/$/.test(path):
            return 'product';
        case /^\/policies\/[a-z0-9-]+\/$/.test(path):
            return 'policy';
        case /^\/search\/$/.test(path):
            return 'search';
        default:
            return 'page';
    }
};

export type AnalyticsEventActionProps = {
    shop: OnlineShop;
    currency: CurrencyCode;
    locale: Locale;
    cart: CartWithActions;
};

const shopifyEventHandler = async (
    event: AnalyticsEventType,
    data: AnalyticsEventData,
    { shop, currency, locale, shopify, cart }: AnalyticsEventActionProps & { shopify: ShopifyContextValue }
) => {
    // Shopify only supports a subset of events.
    if (event !== 'page_view' && event !== 'add_to_cart') {
        throw new TodoError();
        // TODO:.type shouldn't be considered a literal.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (shop.commerceProvider.type !== 'shopify') {
        throw new TodoError('shopifyEventHandler() called for non-Shopify shop.');
    }

    const commerce = shop.commerceProvider;
    const pageType = pathToShopifyPageType((data.path || '').replace(`/${locale.code}/`, '/'));

    const products = data.gtm?.ecommerce?.items || [];
    const value = data.gtm?.ecommerce?.value || 0;

    const pageAnalytics = {
        canonicalUrl: `https://${shop.domain}${data.path}`,
        resourceId: (() => {
            switch (pageType) {
                case 'product': {
                    if (!(products[0]?.product_id as any)) {
                        return undefined;
                    }

                    return `gid://shopify/Product/${products[0].product_id}`;
                }
                default: {
                    return undefined;
                }
            }
        })(),
        pageType
    };

    let path = data.path || '';
    if (path.startsWith(`/${locale.code}/`)) {
        path = path.slice(locale.code.length + 1);
    }

    const sharedPayload: ShopifyPageViewPayload = {
        shopifySalesChannel: ShopifySalesChannel.hydrogen,
        shopId: `gid://shopify/Shop/${commerce.id.toString()}`,
        storefrontId: (shopify.storefrontId || commerce.id).toString(), // TODO: Is this correct?.
        currency: currency,
        acceptedLanguage: locale.language,
        hasUserConsent: true, // TODO: Cookie consent.
        ...getClientBrowserParameters(),
        ...pageAnalytics,
        path,
        //navigationType: 'navigate', // TODO: do this properly.

        totalValue: value,
        products: products.filter(Boolean).map((line) => ({
            productGid: line.product_id!,
            variantGid: line.variant_id!,
            name: line.item_name!,
            variantName: line.item_variant!,
            brand: line.item_brand!,
            category: line.item_category!,
            price: line.price?.toString(10)!,
            sku: line.sku!,
            quantity: line.quantity!
        }))
    };

    if (isCrawler(sharedPayload.userAgent || window.navigator.userAgent)) {
        return;
    }

    // FIXME: We can't actually capture the error here. Make a PR upstream to fix this.
    try {
        switch (event.toUpperCase()) {
            case AnalyticsShopifyEventName.PAGE_VIEW: {
                const data = {
                    eventName: AnalyticsShopifyEventName.PAGE_VIEW,
                    payload: {
                        ...sharedPayload
                    }
                };

                await sendShopifyAnalytics(data, commerce.domain);
                break;
            }
            case AnalyticsShopifyEventName.ADD_TO_CART: {
                const data = {
                    eventName: AnalyticsShopifyEventName.ADD_TO_CART,
                    payload: {
                        cartId: cart.id,
                        ...sharedPayload
                    }
                };

                await sendShopifyAnalytics(data, commerce.domain);
                break;
            }
        }
    } catch (error: unknown) {
        console.warn(error);
    }
};

/**
 * @see {@link https://developers.klaviyo.com/en/v1-2/docs/integrate-with-a-shopify-hydrogen-store#enable-onsite-tracking}
 */
const klaviyoEventHandler = async (
    event: AnalyticsEventType,
    data: AnalyticsEventData, // eslint-disable-line unused-imports/no-unused-vars
    { shop, currency, locale, cart }: AnalyticsEventActionProps // eslint-disable-line unused-imports/no-unused-vars
) => {
    window._learnq = window._learnq || [];

    // TODO: Implement this.
    switch (event) {
        case 'view_item': {
            window._learnq.push(['track', 'Viewed Product', {}]);
            break;
        }

        case 'add_to_cart': {
            window._learnq.push(['track', 'Added to Cart', {}]);
            break;
        }

        default: {
            break;
        }
    }
};

const handleEvent = async (
    event: AnalyticsEventType,
    data: AnalyticsEventData,
    { shop, currency, locale, shopify, cart }: AnalyticsEventActionProps & { shopify: ShopifyContextValue }
) => {
    window.dataLayer = window.dataLayer || [];
    if (window.dataLayer.length <= 0) {
        // FIXME: Actually get the consent status.
        window.dataLayer.push({
            google_tag_params: {
                consent_info: {
                    ad_storage: 'granted',
                    analytics_storage: 'granted',
                    ad_user_data: 'granted',
                    ad_personalization: 'granted',
                    functionality_storage: 'granted',
                    personalization_storage: 'granted',
                    security_storage: 'granted'
                }
            }
        });
    }

    // Don't actually send events in development.
    if (BuildConfig.environment === 'development') {
        return;
    }

    // This should never actually happen, but does in testing since the shop mocks aren't correctly setup.
    if (!(shop as any)?.commerceProvider?.type) {
        return;
    }

    if (data.path && data.gtm?.ecommerce && !data.gtm.ecommerce.ecomm_pagetype) {
        data.gtm.ecommerce.ecomm_pagetype = pathToShopifyPageType(data.path);
    }

    switch (shop.commerceProvider.type) {
        case 'shopify': {
            try {
                await shopifyEventHandler(event, data, { shop, currency, locale, shopify, cart });
            } catch {} // TODO: Handle errors properly.
        }
    }

    await klaviyoEventHandler(event, data, { shop, currency, locale, cart });

    let additionalData = {};
    switch (event) {
        case 'web_vital':
        case 'exception':
            additionalData = {
                ...additionalData,
                non_interaction: true // Avoids affecting bounce rate.
            };
    }

    try {
        window.dataLayer.push({
            event,
            ...additionalData,
            ...(data.gtm || {})
        });
    } catch (error: unknown) {
        console.error(`Error sending "${event}" event: ${(error as any)?.message || error}`);
    }

    if (typeof data.gtm?.ecommerce !== 'undefined') {
        window.dataLayer.push({
            // Get the dataLayer ready for the next event.
            ecommerce: null
        });
    }

    vercelTrack(event);
};

export type TrackableContextValue = {
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

export const TrackableContext = createContext<TrackableContextValue>({} as TrackableContextValue);

export type TrackableProps = {
    children: ReactNode;
    dummy?: boolean;
};
export function Trackable({ children, dummy = false }: TrackableProps) {
    const path = usePathname();
    const prevPath = usePrevious(path);

    const { shop, currency, locale } = useShop();
    if (shop.commerceProvider.type !== 'shopify') {
        throw new UnknownCommerceProviderError(shop.commerceProvider.type);
    }

    const [internalTraffic, setIsInternalTraffic] = useState(dummy ? true : false);
    useEffect(() => {
        if (!(window as any).localStorage) {
            return;
        }

        // Use vercel toolbar to determine internal traffic.
        // TODO: This should be some form of a utility function.
        const value = localStorage.getItem('__vercel_toolbar');
        if (value !== '1') {
            return;
        }

        setIsInternalTraffic(true);
    }, [, internalTraffic]);

    const checkoutDomain = shop.commerceProvider.domain;
    // Only use the domain, not the subdomain.
    let cookieDomain: string | undefined =
        (shop.domain as any)?.split('.').slice(-2).join('.') || shop.domain || undefined;
    if (cookieDomain && !cookieDomain.startsWith('.')) {
        cookieDomain = `.${cookieDomain}`;
    }

    // TODO: Break these out into a separate hook, to support other providers.
    useShopifyCookies(
        BuildConfig.environment === 'production'
            ? { hasUserConsent: true, domain: cookieDomain, checkoutDomain }
            : undefined
    );

    const shopify = useShopify();
    const cart = useCart();

    const [queue, setQueue] = useState<
        {
            type: AnalyticsEventType;
            event: AnalyticsEventData;
        }[]
    >([]);

    const queueEvent = useCallback(
        (type: AnalyticsEventType, event: AnalyticsEventData) => {
            if (internalTraffic) {
                return;
            }

            setQueue((queue) => {
                // FIXME: Don't add duplicate events. This is a very naive implementation.
                return [...queue, { type, event }];
            });
        },
        [queue, setQueue]
    );

    const postEvent = useCallback(
        debounce((type: AnalyticsEventType, event: AnalyticsEventData) => {
            if (internalTraffic) {
                return undefined;
            }

            return handleEvent(type, event, { shop, currency, locale, shopify, cart });
        }, 500),
        [handleEvent, shop, currency, locale, shopify, cart]
    )!;

    // Web vitals.
    /*useReportWebVitals(({ id, value, name, label })  => {
        queueEvent(g
            'web_vital',
            {
                gtm: {
                    category: label === 'web-vital' ? 'Web Vitals' : 'Next.js custom metric',
                    action: name,
                    value: Math.round(name === 'CLS' ? value * 1000 : value),
                    label: id,
                    // avoids affecting bounce rate.
                    non_interaction: true
                }
            },
            {}
        );
    });*/

    // Page view.
    useEffect(() => {
        if (!path || path === prevPath || internalTraffic) {
            return;
        }

        queueEvent('page_view', {
            path,
            gtm: {
                ecommerce: {
                    currency: cart.cost?.totalAmount?.currencyCode!,
                    value: safeParseFloat(undefined, cart.cost?.totalAmount?.amount!),
                    items: ((cart.lines || []).filter((_) => _) as CartLine[]).map((line) => ({
                        item_id: productToMerchantsCenterId({
                            locale,
                            product: {
                                productGid: line.merchandise.product.id!,
                                variantGid: line.merchandise.id!
                            }
                        }),
                        item_name: line.merchandise.product.title,
                        item_variant: line.merchandise.title,
                        item_brand: line.merchandise.product.vendor,
                        currency: line.merchandise.price.currencyCode,
                        price: safeParseFloat(undefined, line.merchandise.price.amount!),
                        quantity: line.quantity
                    }))
                }
            }
        });
    }, [path, prevPath]);

    // Send events.
    useEffect(() => {
        if (queue.length <= 0 || internalTraffic) {
            return;
        }

        // Clone the queue, as it may be modified while we are sending events.
        let events = [...queue];

        // Clear queue to prevent duplicate events.
        setQueue(() => []);

        // Flush the queue.
        Promise.allSettled(
            events.map(({ type, event }) => {
                return handleEvent(
                    type,
                    {
                        ...event,
                        path: event.path || path
                    },
                    { shop, currency, locale, shopify, cart }
                );
            })
        ).then((results) => {
            const failed = results.filter((result) => result.status === 'rejected');

            if (failed.length > 0) {
                console.error('Failed to send analytics events:', failed);
            }
        });
    }, [shop, currency, queue]);

    const store = useMemo(
        () => ({
            queueEvent,
            postEvent
        }),
        [queueEvent, postEvent]
    );

    return useMemo(
        () =>
            store ? (
                <TrackableContext.Provider value={store as TrackableContextValue}>{children}</TrackableContext.Provider>
            ) : (
                children
            ),
        [store, children]
    );
}
Trackable.displayName = 'Nordcom.Trackable';

/**
 * Provides access to the {@link TrackableContext}.
 * Must be a descendant of {@link Trackable}.
 *
 * @returns {TrackableContextValue} The trackable context.
 */
export function useTrackable(): TrackableContextValue {
    const context = useContext(TrackableContext);
    if (!(context as any)) {
        throw new MissingContextProviderError('useTrackable', 'Trackable');
    }

    return context;
}

export function AnalyticsEventTrigger({ event, data }: { event: AnalyticsEventType; data: AnalyticsEventData }) {
    const path = usePathname();
    const { queueEvent } = useTrackable();

    useEffect(() => {
        queueEvent(event, { path, ...data });
    }, []);

    return <Fragment />;
}
