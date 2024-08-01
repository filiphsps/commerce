'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Nullable, Shop } from '@nordcom/commerce-database';
import { MissingContextProviderError } from '@nordcom/commerce-errors';

import { usePrevious } from '@/hooks/usePrevious';
import { BuildConfig } from '@/utils/build-config';
import { ProductToMerchantsCenterId } from '@/utils/merchants-center-id';
import { ShopifyPriceToNumber } from '@/utils/pricing';
import {
    AnalyticsEventName as ShopifyAnalyticsEventName,
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
import { createContext, useContext, useContextSelector } from 'use-context-selector';

import { useShop } from '@/components/shop/provider';

import type { CurrencyCode, Locale } from '@/utils/locale';
import type { CartWithActions, ShopifyPageViewPayload } from '@shopify/hydrogen-react';
import type { ShopifyContextValue } from '@shopify/hydrogen-react/dist/types/ShopifyProvider';
import type { CartLine } from '@shopify/hydrogen-react/storefront-api-types';
import type { ReactNode } from 'react';

// FIXME: Create or use a proper logging solution.
const TrackableLogger = (message: string, data?: any, service?: string) => {
    if (BuildConfig.environment !== 'development') return;

    console.debug(`[nordcom-commerce]${!!service ? `[${service}]` : ''}: ${message}`, data || undefined);
};

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

/**
 * @see {@link https://shopify.dev/docs/api/hydrogen-react/2024-01/utilities/sendshopifyanalytics#analyticspagetype}
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
    shop: Shop;
    currency: CurrencyCode;
    locale: Locale;
    shopify: ShopifyContextValue;
    cart: CartWithActions;
};

const shopifyEventHandler = async (
    event: AnalyticsEventType,
    data: AnalyticsEventData,
    { shop, currency, locale, shopify, cart }: AnalyticsEventActionProps
) => {
    // Shopify only supports a subset of events.
    if (event !== 'page_view' && event !== 'add_to_cart') {
        return;
        // TODO:.type shouldn't be considered a literal.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (shop.commerceProvider.type !== 'shopify') {
        console.error('shopifyEventHandler() called for non-Shopify shop.');
        return;
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
                    if (!products[0]) return undefined;

                    return `gid://shopify/Product/${products[0].product_id}`;
                }
                default: {
                    return undefined;
                }
            }
        })(),
        pageType
    };

    const sharedPayload: ShopifyPageViewPayload = {
        shopifySalesChannel: ShopifySalesChannel.hydrogen,
        shopId: `gid://shopify/Shop/${commerce.id.toString()}`,
        storefrontId: (shopify.storefrontId || commerce.id).toString(), // TODO: Is this correct?.
        currency: currency,
        acceptedLanguage: locale.language,
        hasUserConsent: true, // TODO: Cookie consent.
        ...getClientBrowserParameters(),
        ...pageAnalytics,
        path: (data.path || '').replace(/^\/[a-z]{2}-[a-z]{2}\//, ''),
        //navigationType: 'navigate', // TODO: do this properly.

        totalValue: value,
        products: products.map((line) => ({
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

    const ua = (sharedPayload.userAgent || navigator.userAgent).toLowerCase();
    if (ua.includes('googlebot') || ua.includes('lighthouse')) return;

    // FIXME: We can't actually capture the error here. Make a PR upstream to fix this.
    try {
        switch (event.toUpperCase()) {
            case ShopifyAnalyticsEventName.PAGE_VIEW: {
                const data = {
                    eventName: ShopifyAnalyticsEventName.PAGE_VIEW,
                    payload: {
                        ...sharedPayload
                    }
                };

                TrackableLogger(`Event "${ShopifyAnalyticsEventName.PAGE_VIEW}"`, data, 'shopify');
                await sendShopifyAnalytics(data, commerce.domain);
                break;
            }
            case ShopifyAnalyticsEventName.ADD_TO_CART: {
                const data = {
                    eventName: ShopifyAnalyticsEventName.ADD_TO_CART,
                    payload: {
                        cartId: cart.id,
                        ...sharedPayload
                    }
                };

                TrackableLogger(`Event "${ShopifyAnalyticsEventName.ADD_TO_CART}"`, data, 'shopify');
                await sendShopifyAnalytics(data, commerce.domain);
                break;
            }
        }
    } catch (error: unknown) {
        console.warn(error);
    }
};

const handleEvent = async (
    event: AnalyticsEventType,
    data: AnalyticsEventData,
    { shop, currency, locale, shopify, cart }: AnalyticsEventActionProps
) => {
    if (!window.dataLayer) {
        if (BuildConfig.environment === 'development') {
            TrackableLogger('window.dataLayer not found, creating it.', data, 'analytics');
        }

        window.dataLayer = [];
    }

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

    switch (shop.commerceProvider.type) {
        case 'shopify': {
            await shopifyEventHandler(event, data, { shop, currency, locale, shopify, cart });
        }
    }

    if (BuildConfig.environment === 'development') {
        // Don't actually send events in development.
        return;
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

    try {
        window.dataLayer.push({
            event,
            ...additionalData,
            ...(data.gtm || {})
        });
    } catch (error: any) {
        TrackableLogger(`Error sending "${event}" event: ${error?.message || error}`, 'analytics');
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
};
function Trackable({ children }: TrackableProps) {
    const path = usePathname();
    const prevPath = usePrevious(path);
    const { shop, currency, locale } = useShop();

    // Only use the domain, not the subdomain.
    const cookieDomain = shop.domain.split('.').slice(-2).join('.') || shop.domain;

    // TODO: Break these out into a separate hook, to support other providers.
    useShopifyCookies({ hasUserConsent: true, domain: cookieDomain });
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
            setQueue((queue) => {
                // Don't add duplicate events. This is a very naive implementation.
                const eventHash = JSON.stringify({ type, event });
                if (JSON.stringify(queue.at(-1)) === eventHash || JSON.stringify(queue.at(-2)) === eventHash) {
                    return queue;
                }

                return [...queue, { type, event }];
            });
            return;
        },
        [queue, setQueue]
    );

    const postEvent = useCallback(
        debounce(async (type: AnalyticsEventType, event: AnalyticsEventData) => {
            await handleEvent(type, event, { shop, currency, locale, shopify, cart });
        }, 500),
        [handleEvent, { shop, currency, locale, shopify, cart }]
    )!;

    // Page view.
    useEffect(() => {
        if (!path || path === prevPath) return;

        queueEvent('page_view', { path });

        if (path.endsWith('/cart/') && cart) {
            queueEvent('view_cart', {
                path,
                gtm: {
                    ecommerce: {
                        currency: cart.cost?.totalAmount?.currencyCode!,
                        value: ShopifyPriceToNumber(undefined, cart.cost?.totalAmount?.amount!),
                        items: ((cart.lines || []).filter((_) => _) as CartLine[]).map((line) => ({
                            item_id: ProductToMerchantsCenterId({
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
                            price: ShopifyPriceToNumber(undefined, line.merchandise.price.amount!),
                            quantity: line.quantity
                        }))
                    }
                }
            });
        }
    }, [path, prevPath]);

    // Send events.
    useEffect(() => {
        if (!shop || !currency || !queue || queue.length <= 0) return;

        TrackableLogger(`Sending ${queue.length} event(s): ${queue.map(({ type }) => type).join(', ')}}`, queue);

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
        () => <TrackableContext.Provider value={store as TrackableContextValue}>{children}</TrackableContext.Provider>,
        [store, children]
    );
}

type SelectorFn<T extends keyof TrackableContextValue> = (context: TrackableContextValue) => TrackableContextValue[T];

/**
 * Provides access to the {@link TrackableContext}.
 * Must be a descendant of {@link Trackable}.
 *
 * @returns {TrackableContextValue} The trackable context.
 */
export function useTrackable(): TrackableContextValue;
export function useTrackable<T extends keyof TrackableContextValue>(selector: SelectorFn<T>): TrackableContextValue[T];
export function useTrackable<T extends keyof TrackableContextValue>(
    selector?: SelectorFn<T>
): TrackableContextValue | TrackableContextValue[T] {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const context = selector ? useContextSelector(TrackableContext, selector) : useContext(TrackableContext);
    if (!context) {
        throw new MissingContextProviderError('useTrackable', 'Trackable');
    }

    return context;
}

Trackable.displayName = 'Nordcom.Trackable';
export { Trackable };
