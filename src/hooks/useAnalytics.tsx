import type { ShopifyAddToCartPayload, ShopifyAnalyticsProduct, ShopifyPageViewPayload } from '@shopify/hydrogen-react';
import {
    AnalyticsEventName,
    AnalyticsPageType,
    getClientBrowserParameters,
    sendShopifyAnalytics,
    useCart,
    useShopifyCookies
} from '@shopify/hydrogen-react';
import type { CartCost, CartLine, CurrencyCode } from '@shopify/hydrogen-react/storefront-api-types';

import { usePrevious } from '@/hooks/usePrevious';
import { Config } from '@/utils/Config';
import type { Locale } from '@/utils/Locale';
import { ProductToMerchantsCenterId } from '@/utils/MerchantsCenterId';
import { ShopifyPriceToNumber } from '@/utils/Pricing';
import { ShopifySalesChannel } from '@shopify/hydrogen-react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

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
                    currency: pageAnalytics.currency || cost?.totalAmount?.currencyCode! || 'USD',
                    value: ShopifyPriceToNumber(undefined, product.price),
                    items: [
                        {
                            item_id: ProductToMerchantsCenterId({
                                locale: locale.locale,
                                productId: product.productGid!,
                                variantId: product.variantGid!
                            }),
                            item_name: product.name,
                            item_variant: product.variantName,
                            item_brand: product.brand,
                            currency: pageAnalytics.currency || cost?.totalAmount?.currencyCode! || 'USD',
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
        url: `https://${domain}/${locale.locale}${path || '/'}`,
        canonicalUrl: `https://${domain}/${locale.locale}${path || '/'}`,
        path: path || '/'
    };

    sendShopifyAnalytics(
        {
            eventName: AnalyticsEventName.PAGE_VIEW,
            payload
        },
        Config.shopify.checkout_domain
    );
};

interface useAnalyticsProps {
    shopId: string;
    locale: Locale;
    domain: string;
    pagePropsAnalyticsData: any;
}
export function useAnalytics({ locale, domain, shopId, pagePropsAnalyticsData }: useAnalyticsProps) {
    useShopifyCookies({ hasUserConsent: true, domain: trimDomain(domain) });

    if (!shopId) {
        console.warn(`Invalid shopId: ${shopId}`);
        return;
    } else if (!domain) {
        console.warn(`Invalid domain: ${domain}`);
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
        shopifySalesChannel: ShopifySalesChannel.hydrogen,
        storefrontId: Config.shopify.storefront_id,
        currency: locale.currency,
        acceptedLanguage: locale.language.toLowerCase(),
        hasUserConsent: true,
        isMerchantRequest: true,
        ...((pagePropsAnalyticsData as any) || {}),
        ...({
            url: `https://${domain}/${locale.locale}${path || '/'}`,
            canonicalUrl: `https://${domain}/${locale.locale}${path || '/'}`,
            path: path || '/'
        } as any)
    };

    const router = useRouter();

    // Page view analytics
    // FIXME: We miss the initial PageView
    useEffect(() => {
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
        router.events.on('routeChangeComplete', handleRouteChange);

        return () => {
            router.events.off('routeChangeComplete', handleRouteChange);
        };
    }, []);

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
                        price: merchandise.price?.amount!?.toString() || undefined,
                        quantity
                    }) as any
            ) || [];

        const payload: ShopifyAddToCartPayload = {
            ...getClientBrowserParameters(),
            ...pageAnalytics,
            ...pagePropsAnalyticsData,
            cartId: cartId!,
            totalValue: Number.parseFloat(cost?.totalAmount?.amount!),
            products
        };

        sendShopifyAnalytics(
            {
                eventName: AnalyticsEventName.ADD_TO_CART,
                payload
            },
            Config.shopify.checkout_domain
        );

        sendEcommerceEvent({
            event: 'add_to_cart',
            payload: {
                currency: cost?.totalAmount?.currencyCode! || pageAnalytics.currency || 'USD',
                value: ShopifyPriceToNumber(0, cost?.totalAmount?.amount) * line.quantity || undefined,
                items: ((line: CartLine) => {
                    return [
                        {
                            item_id: ProductToMerchantsCenterId({
                                locale: locale.locale,
                                productId: line.merchandise.product.id,
                                variantId: line.merchandise.id
                            }),
                            item_name: line.merchandise.product.title,
                            item_variant: line.merchandise.title,
                            item_brand: line.merchandise.product.vendor,
                            currency: line.merchandise.price.currencyCode || pageAnalytics.currency || 'USD',
                            price: ShopifyPriceToNumber(undefined, line.merchandise.price?.amount!),
                            quantity: line.quantity
                        }
                    ];
                })(lines.at(-1) as any)
            }
        });
    }, [lines, status]);
}
