'use client';

import type { ShopifyAddToCartPayload, ShopifyPageViewPayload } from '@shopify/hydrogen-react';
import {
    AnalyticsEventName,
    AnalyticsPageType,
    getClientBrowserParameters,
    sendShopifyAnalytics,
    useCart,
    useShopifyCookies
} from '@shopify/hydrogen-react';
import type { CartCost, CartLine, CurrencyCode } from '@shopify/hydrogen-react/storefront-api-types';

import type { Shop } from '@/api/shop';
import { usePrevious } from '@/hooks/usePrevious';
import type { Locale } from '@/utils/locale';
import { ProductToMerchantsCenterId } from '@/utils/merchants-center-id';
import { ShopifyPriceToNumber } from '@/utils/pricing';
import { sendGTMEvent } from '@next/third-parties/google';
import { ShopifySalesChannel } from '@shopify/hydrogen-react';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/* c8 ignore start */
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
    if (window.dataLayer) return;

    sendGTMEvent({ ecommerce: null });
    sendGTMEvent({
        event: event,
        ecommerce: payload
    });
};

export const sendPageViewEvent = ({
    path,
    shop,
    locale,
    pageAnalytics,
    cost
}: {
    path: string;
    shop: Shop;
    locale: Locale;
    pageAnalytics: ShopifyPageViewPayload;
    cost?: CartCost;
}) => {
    if (shop.configuration.commerce.type !== 'shopify') {
        console.warn('Analytics are only supported for Shopify stores.');
        return;
    }

    switch (pageAnalytics.pageType) {
        // https://developers.google.com/analytics/devguides/collection/ga4/reference/events?client_type=gtm#view_item
        case AnalyticsPageType.product: {
            if (!pageAnalytics.products || pageAnalytics.products.length <= 0) break;

            const product = pageAnalytics.products.at(0)!;
            if (!product) throw new Error('Product is missing.');

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
        url: `https://${shop.domains.primary}${path}`,
        canonicalUrl: `https://${shop.domains.primary}${path}`,
        path: path
    };

    try {
        sendShopifyAnalytics(
            {
                eventName: AnalyticsEventName.PAGE_VIEW,
                payload
            },
            shop.configuration.commerce.domain
        );
    } catch (error) {
        console.warn(error);
    }
};

interface useAnalyticsProps {
    shop: Shop;
    locale: Locale;
    pagePropsAnalyticsData: any;
}
export function useAnalytics({ locale, shop, pagePropsAnalyticsData }: useAnalyticsProps) {
    if (process.env.NODE_ENV !== 'production') {
        return null;
    }
    if (shop.configuration.commerce.type !== 'shopify') {
        console.warn('Analytics are only supported for Shopify stores.');
        return null;
    }

    useShopifyCookies({ hasUserConsent: true, domain: shop.configuration.commerce.domain });

    const { lines, id: cartId, cost, status, totalQuantity } = useCart();
    const previousStatus = usePrevious(status);
    const previousQuantity = usePrevious(totalQuantity);

    const viewPayload = {
        navigationType: 'navigate'
    } as unknown as ShopifyPageViewPayload;

    const pageAnalytics: ShopifyPageViewPayload = {
        ...viewPayload,
        shopId: shop.configuration.commerce.id,
        shopifySalesChannel: ShopifySalesChannel.hydrogen, // FIXME: Use `ShopifySalesChannel.headless` when Shopify fixes analytics.
        storefrontId: shop.configuration.commerce.storefrontId,
        currency: locale.currency,
        acceptedLanguage: locale.language,
        hasUserConsent: true,
        isMerchantRequest: true,
        ...((pagePropsAnalyticsData as any) || {})
    };

    const route = usePathname();

    // Page view analytics
    // FIXME: We miss firing on the initial PageView.
    useEffect(() => {
        if (!route) return;

        const handleRouteChange = (url: string) => {
            if (shop.configuration.commerce.type !== 'shopify') {
                console.warn('Analytics are only supported for Shopify stores.');
                return;
            }

            const path = `/${url.split('/').slice(2, -1).join('/')}/`.replace('//', '/');
            sendPageViewEvent({
                path,
                shop,
                locale,
                pageAnalytics,
                cost: cost as any
            });
        };

        handleRouteChange(route);
    }, [route]);

    // Add to cart analytics
    useEffect(() => {
        // TODO: Create `useCartEvents` hooks to simplify this.
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
            if (shop.configuration.commerce.type === 'shopify') {
                sendShopifyAnalytics(
                    {
                        eventName: AnalyticsEventName.ADD_TO_CART,
                        payload
                    },
                    shop.configuration.commerce.domain
                );
            }
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

    return {};
}
/* c8 ignore stop */
