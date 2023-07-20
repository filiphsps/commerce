import {
    AnalyticsEventName,
    getClientBrowserParameters,
    sendShopifyAnalytics,
    useShopifyCookies
} from '@shopify/hydrogen';
import { AnalyticsPageType, ShopifyAnalyticsProduct, useCart } from '@shopify/hydrogen-react';
import { CartLine, CurrencyCode } from '@shopify/hydrogen-react/storefront-api-types';
import type { ShopifyAddToCartPayload, ShopifyPageViewPayload } from '@shopify/hydrogen';

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

interface AnalyticsEcommercePayload {
    currency: CurrencyCode;
    value: number;
    items?: Array<{}>;
}
const sendEcommerceEvent = ({
    event,
    payload
}: {
    event: 'view_item';
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
        hasUserConsent: true,
        ...pagePropsAnalyticsData
    };

    const { asPath: path } = useRouter();
    const previousPath = usePrevious(path);

    // Page view analytics
    // FIXME: figure out why this fires twice.
    useEffect(() => {
        if (!pageAnalytics.shopId || path == previousPath) return;

        switch (pageAnalytics.pageType) {
            // https://developers.google.com/analytics/devguides/collection/ga4/reference/events?client_type=gtm#view_item
            case AnalyticsPageType.product: {
                if (!pageAnalytics.products || pageAnalytics.products.length <= 0) break;

                const product = pageAnalytics.products.at(0)!;
                sendEcommerceEvent({
                    event: 'view_item',
                    payload: {
                        currency: pageAnalytics.currency,
                        value: Number.parseFloat(product.price!) || 0,
                        items: [
                            {
                                item_id: ProductToMerchantsCenterId({
                                    locale:
                                        (router.locale !== 'x-default' && router.locale) ||
                                        router.locales?.[1],
                                    productId: product.productGid!,
                                    variantId: product.variantGid!
                                }),
                                item_name: product.name,
                                item_variant: product.variantName,
                                item_brand: product.brand,
                                currency: pageAnalytics.currency,
                                price: Number.parseFloat(product.price!) || undefined,
                                quantity: product.quantity
                            }
                        ]
                    }
                });
                break;
            }
        }

        // Don't send during development!
        if (process.env.NODE_ENV === 'development') return;

        const payload: ShopifyPageViewPayload = {
            ...getClientBrowserParameters(),
            ...pageAnalytics,
            url: `https://${domain}${path}`,
            path: path,
            canonicalUrl: `https://${domain}${path}`
        };

        sendShopifyAnalytics({
            eventName: AnalyticsEventName.PAGE_VIEW,
            payload
        });
    }, [previousPath]);

    const { lines, id: cartId, cost, status } = useCart();
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
                ecommerce: {
                    currency: cost?.totalAmount?.currencyCode!,
                    value: Number.parseFloat(cost?.totalAmount?.amount!),
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
