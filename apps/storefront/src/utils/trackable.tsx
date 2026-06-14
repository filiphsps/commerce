'use client';

import { useMaybeCart } from '@nordcom/cart-react';
import type { Nullable, OnlineShop, ShopifyCommerceProvider } from '@nordcom/commerce-db';
import { MissingContextProviderError, TodoError } from '@nordcom/commerce-errors';
import type { ShopifyPageViewPayload } from '@shopify/hydrogen-react';
// Only the lightweight context hooks are imported statically. The analytics send path
// (`sendShopifyAnalytics` + `getClientBrowserParameters` and friends) is the heavy part of
// `@shopify/hydrogen-react`, so it is pulled in via a dynamic `import()` inside the event handler
// to land in a lazy chunk instead of the initial bundle every page ships.
import { useShop as useShopify, useShopifyCookies } from '@shopify/hydrogen-react';
import type { ShopifyContextValue } from '@shopify/hydrogen-react/ShopifyProvider';
import { track as vercelTrack } from '@vercel/analytics/react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Fragment, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createContext, useContext } from 'use-context-selector';
import { useShop } from '@/components/shop/provider';
import { usePrevious } from '@/hooks/usePrevious';
import { BuildConfig } from '@/utils/build-config';
import { isCrawler } from '@/utils/is-crawler';
import type { CurrencyCode, Locale } from '@/utils/locale';
import { productToMerchantsCenterId } from '@/utils/merchants-center-id';
import { safeParseFloat } from '@/utils/pricing';

type UseCartReturn = NonNullable<ReturnType<typeof useMaybeCart>>;
type TrackableCart = NonNullable<UseCartReturn['cart']>;

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
        [key: string]: unknown;
        ecommerce?: {
            [key: string]: unknown;
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
    cart: TrackableCart | null;
};

const shopifyEventHandler = async (
    event: AnalyticsEventType,
    data: AnalyticsEventData,
    { shop, currency, locale, shopify, cart }: AnalyticsEventActionProps & { shopify: ShopifyContextValue },
) => {
    // Shopify only supports a subset of events.
    if (event !== 'page_view' && event !== 'add_to_cart') {
        throw new TodoError();
    } else if (shop.commerceProvider.type !== 'shopify') {
        throw new TodoError('shopifyEventHandler() called for non-Shopify shop.');
    }

    // Lazy-load the analytics surface so it lands in a separate chunk rather than the page bundle.
    const {
        AnalyticsEventName: AnalyticsShopifyEventName,
        getClientBrowserParameters,
        ShopifySalesChannel,
        sendShopifyAnalytics,
    } = await import('@shopify/hydrogen-react');

    const commerce = shop.commerceProvider;
    const pageType = pathToShopifyPageType((data.path || '').replace(`/${locale.code}/`, '/'));

    const products = data.gtm?.ecommerce?.items || [];
    const value = data.gtm?.ecommerce?.value || 0;

    const pageAnalytics = {
        canonicalUrl: `https://${shop.domain}${data.path}`,
        resourceId: (() => {
            switch (pageType) {
                case 'product': {
                    if (!products[0]?.product_id) {
                        return undefined;
                    }

                    return `gid://shopify/Product/${products[0].product_id}`;
                }
                default: {
                    return undefined;
                }
            }
        })(),
        pageType,
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
            price: line.price?.toString(10) ?? '',
            sku: line.sku!,
            quantity: line.quantity!,
        })),
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
                        ...sharedPayload,
                    },
                };

                await sendShopifyAnalytics(data, commerce.domain);
                break;
            }
            case AnalyticsShopifyEventName.ADD_TO_CART: {
                if (!cart?.id) {
                    // The Shopify ADD_TO_CART event requires a cartId — drop
                    // the event when the cart provider isn't in scope rather
                    // than send a malformed payload.
                    break;
                }

                const data = {
                    eventName: AnalyticsShopifyEventName.ADD_TO_CART,
                    payload: {
                        cartId: cart.id,
                        ...sharedPayload,
                    },
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
 *
 * The Klaviyo loader script is not currently injected anywhere — every push
 * just grows `window._learnq` for the lifetime of the session with no
 * consumer. Skip the work entirely until the loader exists; gate on a runtime
 * presence check so a future loader injection lights the integration up
 * without code changes here.
 */
const klaviyoEventHandler = async (event: AnalyticsEventType, _data: AnalyticsEventData) => {
    if (typeof window === 'undefined') return;
    if (!Array.isArray(window._learnq) && typeof window._learnq?.push !== 'function') {
        // Loader hasn't initialized — don't manufacture a sink that nobody
        // drains.
        return;
    }

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
    { shop, currency, locale, shopify, cart }: AnalyticsEventActionProps & { shopify: ShopifyContextValue },
) => {
    window.dataLayer = window.dataLayer || [];
    if (window.dataLayer.length <= 0) {
        // Push consent defaults BEFORE any other event so GTM/GA4 see the
        // baseline gate. The previous defaults hard-coded every category to
        // `granted`, which defeated downstream consent gating (and is the
        // wrong default for EU GDPR/PECR jurisdictions). Default to `denied`
        // — the CMP (when wired) is responsible for escalating to `granted`
        // by emitting its own `consent` update.
        window.dataLayer.push({
            google_tag_params: {
                consent_info: {
                    ad_storage: 'denied',
                    analytics_storage: 'denied',
                    ad_user_data: 'denied',
                    ad_personalization: 'denied',
                    functionality_storage: 'denied',
                    personalization_storage: 'denied',
                    // `security_storage` is for fraud/CSRF cookies and is
                    // considered essential by GA4 — keep granted.
                    security_storage: 'granted',
                },
            },
        });
    }

    // Don't actually send events in development.
    if (BuildConfig.environment === 'development') {
        return;
    }

    // This should never actually happen, but does in testing since the shop mocks aren't correctly setup.
    if (!shop?.commerceProvider?.type) {
        return;
    }

    if (data.path && data.gtm?.ecommerce && !data.gtm.ecommerce.ecomm_pagetype) {
        data.gtm.ecommerce.ecomm_pagetype = pathToShopifyPageType(data.path);
    }

    switch (shop.commerceProvider.type) {
        case 'shopify': {
            try {
                await shopifyEventHandler(event, data, { shop, currency, locale, shopify, cart });
            } catch (error: unknown) {
                // shopifyEventHandler throws TodoError for events Shopify's sink doesn't model
                // (anything but page_view/add_to_cart) — that's expected; only surface real failures.
                if (!(error instanceof TodoError)) {
                    console.error(
                        `Error in shopifyEventHandler for "${event}": ${error instanceof Error ? error.message : String(error)}`,
                    );
                }
            }
            break;
        }
    }

    await klaviyoEventHandler(event, data);

    let additionalData = {};
    switch (event) {
        case 'web_vital':
        case 'exception':
            additionalData = {
                ...additionalData,
                non_interaction: true, // Avoids affecting bounce rate.
            };
    }

    try {
        window.dataLayer.push({
            event,
            ...additionalData,
            ...(data.gtm || {}),
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Error sending "${event}" event: ${message}`);
    }

    if (typeof data.gtm?.ecommerce !== 'undefined') {
        window.dataLayer.push({
            // Get the dataLayer ready for the next event.
            ecommerce: null,
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

// Inert tracking context for the prerender Suspense fallback (and any tenant
// without a Shopify commerce provider). Lets descendants call `useTrackable`
// without crashing while still being a no-op at runtime.
export const NOOP_TRACKABLE_VALUE: TrackableContextValue = {
    queueEvent: () => {},
    postEvent: async () => undefined,
};

/**
 * Trailing-edge debounce — coalesces calls within `wait` ms into a single deferred invocation.
 *
 * Replaces `lodash.debounce` (the analytics provider's only use of it) with a few lines so the
 * dependency stays out of the client bundle.
 *
 * @param fn - The function to debounce.
 * @param wait - The quiet period in milliseconds before `fn` runs with the latest arguments.
 * @returns A debounced wrapper around `fn`.
 */
function debounce<Args extends unknown[]>(fn: (...args: Args) => unknown, wait: number) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return (...args: Args): void => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => fn(...args), wait);
    };
}

// Subscribe to `storage` events so a Vercel-toolbar flip in another tab
// propagates without a reload. The previous no-op `subscribe` meant
// `useSyncExternalStore` would never re-read the snapshot after first mount.
const subscribeToStorage = (callback: () => void) => {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener('storage', callback);
    return () => window.removeEventListener('storage', callback);
};
const getInternalTrafficFlag = (): boolean => {
    if (typeof window === 'undefined') {
        return false;
    }

    // Wrap the `localStorage` read — Safari private browsing and Firefox's
    // third-party-isolated mode throw `SecurityError` on access. An unhandled
    // throw inside `useSyncExternalStore`'s getSnapshot tears down the
    // surrounding tree.
    try {
        return window?.localStorage?.getItem?.('__vercel_toolbar') === '1';
    } catch {
        return false;
    }
};

export type TrackableProps = {
    children: ReactNode;
    dummy?: boolean;
};
/**
 * Inner analytics provider that wires up Shopify cookies, queues analytics events, and dispatches page-view events on navigation changes.
 *
 * @param props.children - The subtree to wrap with the analytics context.
 * @param props.dummy - When `true`, suppresses all event dispatch regardless of internal-traffic detection.
 * @returns The `TrackableContext.Provider` wrapping `children`.
 */
function TrackableInner({ children, dummy = false }: TrackableProps) {
    const path = usePathname();
    const prevPath = usePrevious(path);

    const { shop, currency, locale } = useShop();

    const detectedInternalTraffic = useSyncExternalStore<boolean>(
        subscribeToStorage,
        getInternalTrafficFlag,
        () => false,
    );
    const internalTraffic = dummy || detectedInternalTraffic;

    // Shopify's checkout/attribution domain: the commerce provider's configured domain, falling
    // back to the storefront's own host (never a placeholder) so cookie attribution still scopes
    // to a real domain when a tenant hasn't set a distinct checkout domain.
    const checkoutDomain = (shop.commerceProvider as ShopifyCommerceProvider).domain || shop.domain || undefined;
    // Only use the domain, not the subdomain.
    let cookieDomain: string | undefined = shop.domain?.split('.').slice(-2).join('.') || shop.domain || undefined;
    if (cookieDomain && !cookieDomain.startsWith('.')) {
        cookieDomain = `.${cookieDomain}`;
    }

    // TODO: Break these out into a separate hook, to support other providers.
    // Default to prod-only so dev doesn't pollute the shop's analytics, but
    // expose an opt-in for staging/preview parity testing (otherwise the
    // attribution cookies are absent in staging and checkout flows behave
    // subtly differently from prod, masking a whole bug class).
    const enableShopifyCookies =
        BuildConfig.environment === 'production' || process.env.NEXT_PUBLIC_FORCE_SHOPIFY_COOKIES === 'true';
    useShopifyCookies(
        enableShopifyCookies ? { hasUserConsent: true, domain: cookieDomain, checkoutDomain } : undefined,
    );

    const shopify = useShopify();
    // `useMaybeCart` (vs `useCart`) keeps analytics opt-in — Trackable mounts
    // in routes that may not have a CartProvider in scope, and a missing
    // provider should degrade to "no cart context" rather than crash the tree.
    const cart = useMaybeCart()?.cart ?? null;

    const queueRef = useRef<
        {
            type: AnalyticsEventType;
            event: AnalyticsEventData;
        }[]
    >([]);
    // Bumping this counter signals that the queue ref has new entries to flush.
    const [_flushSignal, setFlushSignal] = useState(0);

    const queueEvent = useCallback(
        (type: AnalyticsEventType, event: AnalyticsEventData) => {
            if (internalTraffic) {
                return;
            }

            // FIXME: Don't add duplicate events. This is a very naive implementation.
            queueRef.current = [...queueRef.current, { type, event }];
            setFlushSignal((signal) => signal + 1);
        },
        [internalTraffic],
    );

    const postEvent = useMemo(
        () =>
            debounce((type: AnalyticsEventType, event: AnalyticsEventData) => {
                if (internalTraffic) {
                    return undefined;
                }

                return handleEvent(type, event, { shop, currency, locale, shopify, cart });
            }, 500),
        [internalTraffic, shop, currency, locale, shopify, cart],
    );

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

    // Stable ref to queueEvent so the page-view effect doesn't depend on
    // every cart/locale tick yet still calls the up-to-date implementation.
    const queueEventRef = useRef(queueEvent);
    useEffect(() => {
        queueEventRef.current = queueEvent;
    });

    // Page view.
    useEffect(() => {
        if (!path || path === prevPath || internalTraffic) {
            return;
        }

        const totalMoney = cart?.cost?.total ?? cart?.cost?.subtotal ?? null;

        queueEventRef.current('page_view', {
            path,
            gtm: {
                ecommerce: {
                    currency: totalMoney?.currencyCode,
                    value: safeParseFloat(undefined, totalMoney?.amount),
                    items: (cart?.lines ?? []).map((line) => ({
                        item_id: productToMerchantsCenterId({
                            locale,
                            product: {
                                productGid: line.merchandise.productId,
                                variantGid: line.merchandise.id,
                            },
                        }),
                        item_name: line.merchandise.productTitle,
                        item_variant: line.merchandise.variantTitle,
                        item_brand: line.merchandise.productVendor ?? undefined,
                        currency: line.merchandise.unitPrice.currencyCode,
                        price: safeParseFloat(undefined, line.merchandise.unitPrice.amount),
                        quantity: line.quantity,
                    })),
                },
            },
        });
    }, [path, prevPath, internalTraffic, cart, locale]);

    // Send events whenever the queue ref grows (signaled by flushSignal).
    useEffect(() => {
        if (queueRef.current.length <= 0 || internalTraffic) {
            return;
        }

        // Clone the queue, then clear it to prevent duplicate events.
        const events = queueRef.current;
        queueRef.current = [];

        // Flush the queue.
        Promise.allSettled(
            events.map(({ type, event }) => {
                return handleEvent(
                    type,
                    {
                        ...event,
                        path: event.path || path,
                    },
                    { shop, currency, locale, shopify, cart },
                );
            }),
        ).then((results) => {
            const failed = results.filter((result) => result.status === 'rejected');

            if (failed.length > 0) {
                console.error('Failed to send analytics events:', failed);
            }
        });
    }, [internalTraffic, shop, currency, locale, shopify, cart, path]);

    const store = useMemo(
        () => ({
            queueEvent,
            postEvent,
        }),
        [queueEvent, postEvent],
    );

    return useMemo(
        () => <TrackableContext.Provider value={store as TrackableContextValue}>{children}</TrackableContext.Provider>,
        [store, children],
    );
}

// `usePathname` (and other uncached client APIs in `TrackableInner`) are
// considered uncached data under `cacheComponents`. Without a Suspense
// boundary they block the route from prerendering. Render the children with a
// noop tracking context during prerender; the real provider takes over after
// hydration without disturbing any descendant `useTrackable` callers.
/**
 * Public analytics boundary that renders children with a noop tracking context during prerender and activates the real provider after hydration.
 *
 * @param props.children - The subtree to wrap with analytics tracking.
 * @param props.dummy - When `true`, suppresses all event dispatch; forwarded to `TrackableInner`.
 * @returns A `Suspense`-wrapped provider tree.
 */
export function Trackable({ children, dummy = false }: TrackableProps) {
    return (
        <Suspense
            fallback={<TrackableContext.Provider value={NOOP_TRACKABLE_VALUE}>{children}</TrackableContext.Provider>}
        >
            <TrackableInner dummy={dummy}>{children}</TrackableInner>
        </Suspense>
    );
}
Trackable.displayName = 'Nordcom.Trackable';

/**
 * Provides access to the {@link TrackableContext}.
 * Must be a descendant of {@link Trackable}.
 *
 * @returns The trackable context.
 * @throws {MissingContextProviderError} When called outside of a `Trackable` provider tree.
 */
export function useTrackable(): TrackableContextValue {
    const context = useContext(TrackableContext);
    if (!(context as typeof context | null)) {
        throw new MissingContextProviderError('useTrackable', 'Trackable');
    }

    return context;
}

/**
 * Headless component that queues a single analytics event once on mount, using the current pathname as the event path.
 *
 * @param props.event - The analytics event type to dispatch.
 * @param props.data - Additional event data merged with the current pathname.
 * @returns An empty `Fragment`; this component has no visual output.
 */
export function AnalyticsEventTrigger({ event, data }: { event: AnalyticsEventType; data: AnalyticsEventData }) {
    const path = usePathname();
    const { queueEvent } = useTrackable();

    // Snapshot the inputs in refs so we only ever fire once on mount but still
    // use the latest values.
    const eventRef = useRef(event);
    const pathRef = useRef(path);
    const dataRef = useRef(data);
    const queueEventRef = useRef(queueEvent);
    useEffect(() => {
        eventRef.current = event;
        pathRef.current = path;
        dataRef.current = data;
        queueEventRef.current = queueEvent;
    });

    useEffect(() => {
        queueEventRef.current(eventRef.current, { path: pathRef.current, ...dataRef.current });
    }, []);

    return <Fragment />;
}
