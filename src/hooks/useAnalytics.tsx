import {
    AnalyticsEventName,
    getClientBrowserParameters,
    sendShopifyAnalytics,
    useShopifyCookies
} from '@shopify/hydrogen';
import type { ShopifyAddToCartPayload, ShopifyPageViewPayload } from '@shopify/hydrogen';
import { ShopifyAnalyticsProduct, useCart } from '@shopify/hydrogen-react';

import { CartLine } from '@shopify/hydrogen-react/storefront-api-types';
import { Locale } from '../util/Locale';
import { ProductToMerchantsCenterId } from 'src/util/MerchantsCenterId';
import { ShopifySalesChannel } from '@shopify/hydrogen';
import { useEffect } from 'react';
import { usePrevious } from './usePrevious';
import { useRouter } from 'next/router';

const trimDomain = (domain?: string): string | undefined => {
    if (!domain) return undefined;
    else if (process.env.NODE_ENV === 'development') return undefined;

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

interface useAnalyticsProps {
    shopId: string;
    locale: Locale;
    domain: string;
    pagePropsAnalyticsData: any;
}
export function useAnalytics({
    locale,
    domain,
    shopId,
    pagePropsAnalyticsData
}: useAnalyticsProps) {
    const router = useRouter();
    useShopifyCookies({ hasUserConsent: true, domain: trimDomain(domain) });

    if (!shopId || !domain) {
        console.error(`Invalid shopId`, shopId);
    }

    const viewPayload = {
        navigationType: 'navigate'
    } as unknown as ShopifyPageViewPayload;

    const pageAnalytics = {
        ...viewPayload,
        shopId,
        shopifySalesChannel: ShopifySalesChannel.hydrogen,
        currency: locale.currency,
        acceptedLanguage: locale.language,
        hasUserConsent: true
    };

    const { asPath: path } = useRouter();
    const previousPath = usePrevious(path);

    // Page view analytics
    useEffect(() => {
        // Don't send during development!
        if (process.env.NODE_ENV === 'development') return;

        if (!pageAnalytics.shopId || path === previousPath) return;

        const payload: ShopifyPageViewPayload = {
            ...getClientBrowserParameters(),
            ...pageAnalytics,
            ...pagePropsAnalyticsData,
            url: `https://${domain}${path}`,
            path: path,
            canonicalUrl: `https://${domain}${path}`
        };

        sendShopifyAnalytics({
            eventName: AnalyticsEventName.PAGE_VIEW,
            payload
        });
    }, [path]);

    const { lines, id: cartId, cost, status, cartFragment } = useCart();
    const previousLines = usePrevious(lines);
    const previousStatus = usePrevious(status);

    // Add to cart analytics
    useEffect(() => {
        // Don't send during development!
        if (process.env.NODE_ENV === 'development') return;

        // Logic error here, this doesn't send for the first item
        if (!pageAnalytics.shopId) return;
        if (
            previousStatus !== 'updating' ||
            status !== 'idle' ||
            !lines ||
            !previousLines ||
            lines.length <= 0 ||
            lines.length <= previousLines.length
        )
            return;

        const products: Array<ShopifyAnalyticsProduct> =
            (lines as Array<CartLine>).map(
                ({ merchandise, quantity }) =>
                    ({
                        sku: merchandise.sku,
                        productGid: merchandise.product.id,
                        variantGid: merchandise.id,
                        name: merchandise.product.title,
                        variantName: merchandise.title,
                        brand: merchandise.product.vendor,
                        currency: merchandise.price.currencyCode,
                        price: Number.parseFloat(merchandise.price?.amount!) || undefined,
                        quantity
                    }) as any
            ) || [];

        const payload: ShopifyAddToCartPayload = {
            ...getClientBrowserParameters(),
            ...pageAnalytics,
            ...pagePropsAnalyticsData,
            cartId: cartId!,
            totalValue: Number.parseFloat(cost?.totalAmount?.amount!),
            products,
            url: `https://${domain}${path}`,
            path: path,
            canonicalUrl: `https://${domain}${path}`
        };

        sendShopifyAnalytics({
            eventName: AnalyticsEventName.ADD_TO_CART,
            payload
        });

        (window as any)?.dataLayer?.push(
            {
                ecommerce: null
            },
            {
                // https://developers.google.com/analytics/devguides/collection/ga4/reference/events?client_type=gtm#example_3
                event: 'add_to_cart',

                currency: cost?.totalAmount?.currencyCode!,
                value: Number.parseFloat(cost?.totalAmount?.amount!),
                ecommerce: {
                    items: ((line: CartLine) => {
                        return [
                            {
                                item_id: ProductToMerchantsCenterId({
                                    locale:
                                        (router.locale !== 'x-default' && router.locale) ||
                                        router.locales?.[1],
                                    productId: line.merchandise.product.id,
                                    variantId: line.merchandise.id
                                }),
                                item_name: line.merchandise.product.title,
                                item_variant: line.merchandise.title,
                                item_brand: line.merchandise.product.vendor,
                                currency: line.merchandise.price.currencyCode,
                                price:
                                    Number.parseFloat(line.merchandise.price?.amount!) || undefined,
                                quantity: line.quantity
                            }
                        ];
                    })(lines.at(-1) as any)
                }
            }
        );
    }, [lines, status]);
}
