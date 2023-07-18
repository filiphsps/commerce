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

    const { lines, id: cartId, cost, status } = useCart();
    const previousLines = usePrevious(lines);
    const previousStatus = usePrevious(status);

    // Add to cart analytics
    useEffect(() => {
        // Don't send during development!
        if (process.env.NODE_ENV === 'development') return;

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
                ({ merchandise, quantity, cost }) =>
                    ({
                        productGid: merchandise.product.id,
                        variantGid: merchandise.id,
                        name: merchandise.product.title,
                        variantName: merchandise.title,
                        price: Number.parseFloat(cost.amountPerQuantity?.amount || '0'),
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
            { ecommerce: null },
            {
                event: 'add_to_cart',
                currency: cost?.totalAmount?.currencyCode || 'USD',
                value: Number.parseFloat(cost?.totalAmount?.amount || '0'),
                ecommerce: {
                    items: [
                        {
                            item_id: products.at(-1)?.sku!,
                            item_name: products.at(-1)?.name,
                            item_variant: products.at(-1)?.variantName,
                            item_brand: products.at(-1)?.brand,
                            currency: cost?.totalAmount?.currencyCode || 'USD',
                            price: Number.parseFloat(products.at(-1)?.price || '0'),
                            quantity: products.at(-1)?.quantity || 0
                        }
                    ]
                }
            }
        );
    }, [lines, status]);
}
