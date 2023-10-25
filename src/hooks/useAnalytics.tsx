'use client';

import {
    AnalyticsEventName,
    AnalyticsPageType,
    getClientBrowserParameters,
    sendShopifyAnalytics,
    useCart,
    useShopifyCookies
} from '@shopify/hydrogen-react';
import type { CartCost, CartLine, CurrencyCode } from '@shopify/hydrogen-react/storefront-api-types';
import type { ShopifyAddToCartPayload, ShopifyPageViewPayload } from '@shopify/hydrogen-react';

import { Config } from '@/utils/Config';
import type { Locale } from '@/utils/Locale';
import { ProductToMerchantsCenterId } from '@/utils/MerchantsCenterId';
import { ShopifyPriceToNumber } from '@/utils/Pricing';
import { ShopifySalesChannel } from '@shopify/hydrogen-react';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { usePrevious } from '@/hooks/usePrevious';

const trimDomain = (domain?: string): string | undefined => {
    if (!domain) return undefined;

    let match,
        result = '';
    if ((match = domain.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n\?\=]+)/im))) {
        result = match[1];
        if ((match = result.match(/^[^\.]+\.(.+\..+)$/))) {
            result = match[1];
        }
    }

    return result;
};

interface AnalyticsEcommercePayload {
    currency: CurrencyCode;
    value: number;
    items?: Array<{}>;
}
const sendEcommerceEvent = ({
    event,
    payload
}: {
    event: 'view_item' | 'add_to_cart';
    payload: AnalyticsEcommercePayload;
}) => {
    if (!(window as any)?.dataLayer) return;

    (window as any)?.dataLayer?.push(
        { ecommerce: null },
        {
            event: event,
            ecommerce: payload
        }
    );
};

export const sendPageViewEvent = ({
    path,
    domain,
    locale,
    pageAnalytics,
    cost
}: {
    path: string;
    domain: string;
    locale: Locale;
    pageAnalytics: ShopifyPageViewPayload;
    cost?: CartCost;
}) => {
    switch (pageAnalytics.pageType) {
        // https://developers.google.com/analytics/devguides/collection/ga4/reference/events?client_type=gtm#view_item
        case AnalyticsPageType.product: {
            if (!pageAnalytics.products || pageAnalytics.products.length <= 0) break;

            const product = pageAnalytics.products.at(0)!;
            sendEcommerceEvent({
                event: 'view_item',
                payload: {
                    currency: pageAnalytics.currency || cost?.totalAmount?.currencyCode!,
                    value: ShopifyPriceToNumber(0, cost?.totalAmount?.amount, product.price),
                    items: [
                        {
                            item_id: ProductToMerchantsCenterId({
                                locale: locale,
                                product: product
                            }),
                            item_name: product.name,
                            item_variant: product.variantName,
                            item_brand: product.brand,
                            currency: pageAnalytics.currency || cost?.totalAmount?.currencyCode!,
                            price: ShopifyPriceToNumber(undefined, product.price!),
                            quantity: product.quantity
                        }
                    ]
                }
            });
            break;
        }
    }

    const payload: ShopifyPageViewPayload = {
        ...getClientBrowserParameters(),
        ...pageAnalytics,
        url: `https://${domain}${path}`,
        canonicalUrl: `https://${domain}${path}`,
        path: path
    };

    try {
        sendShopifyAnalytics(
            {
                eventName: AnalyticsEventName.PAGE_VIEW,
                payload
            },
            Config.shopify.checkout_domain
        );
    } catch (error) {
        console.warn(error);
    }
};

interface useAnalyticsProps {
    shopId: string;
    locale: Locale;
    domain: string;
    pagePropsAnalyticsData: any;
}
export function useAnalytics({ locale, domain, shopId, pagePropsAnalyticsData }: useAnalyticsProps) {
    useShopifyCookies({ hasUserConsent: true, domain: trimDomain(domain) });

    if (process.env.NODE_ENV === 'development') return;

    const path = usePathname();
    if (!shopId || !domain) {
        console.error(`Invalid shopId ("${shopId}") or domain ("${domain}") - on route: "${path}"`);
        return;
    }

    const { lines, id: cartId, cost, status, totalQuantity } = useCart();
    const previousStatus = usePrevious(status);
    const previousQuantity = usePrevious(totalQuantity);

    const viewPayload = {
        navigationType: 'navigate'
    } as unknown as ShopifyPageViewPayload;

    const pageAnalytics: ShopifyPageViewPayload = {
        ...viewPayload,
        shopId,
        shopifySalesChannel: ShopifySalesChannel.hydrogen, // FIXME: Use `ShopifySalesChannel.headless` when Shopify fixes analytics.
        storefrontId: Config.shopify.storefront_id,
        currency: locale.currency,
        acceptedLanguage: locale.language,
        hasUserConsent: true,
        isMerchantRequest: true,
        ...((pagePropsAnalyticsData as any) || {})
    };

    const route = usePathname();

    // Page view analytics
    // FIXME: We miss the initial PageView
    useEffect(() => {
        if (!route) return;

        const handleRouteChange = (url: string) => {
            const path = `/${url.split('/').slice(2, -1).join('/')}/`.replace('//', '/');
            sendPageViewEvent({
                path,
                domain,
                locale,
                pageAnalytics,
                cost: cost as any
            });
        };

        handleRouteChange(route);
    }, [route]);

    // Add to cart analytics
    useEffect(() => {
        // TODO: create useCartEvents hooks to simplify this
        if (!pageAnalytics.shopId) return;
        if (
            !previousStatus ||
            !['updating', 'creating'].includes(previousStatus) ||
            status !== 'idle' ||
            !lines ||
            lines.length <= 0 ||
            !totalQuantity ||
            totalQuantity <= 0 ||
            totalQuantity < (previousQuantity || 0)
        )
            return;

        const payload: ShopifyAddToCartPayload = {
            ...getClientBrowserParameters(),
            ...pageAnalytics,
            ...pagePropsAnalyticsData,
            cartId: cartId!,
            totalValue: Number.parseFloat(cost?.totalAmount?.amount!)
        };

        try {
            sendShopifyAnalytics(
                {
                    eventName: AnalyticsEventName.ADD_TO_CART,
                    payload
                },
                Config.shopify.checkout_domain
            );
        } catch (error) {
            console.warn(error);
        }

        sendEcommerceEvent({
            event: 'add_to_cart',
            payload: {
                currency: cost?.totalAmount?.currencyCode! || pageAnalytics.currency,
                value: ShopifyPriceToNumber(0, cost?.totalAmount?.amount),
                items: ((line: CartLine) => {
                    return [
                        {
                            item_id: ProductToMerchantsCenterId({
                                locale: locale,
                                product: {
                                    productGid: line.merchandise.product.id,
                                    variantGid: line.merchandise.id
                                } as any
                            }),
                            item_name: line.merchandise.product.title,
                            item_variant: line.merchandise.title,
                            item_brand: line.merchandise.product.vendor,
                            currency: line.merchandise.price.currencyCode,
                            price: ShopifyPriceToNumber(undefined, line.merchandise.price?.amount!),
                            quantity: line.quantity
                        }
                    ];
                })(lines.at(-1) as any)
            }
        });
    }, [lines, status]);
}
