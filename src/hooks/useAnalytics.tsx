import {
    AnalyticsEventName,
    AnalyticsPageType,
    ShopifyAnalyticsProduct,
    getClientBrowserParameters,
    sendShopifyAnalytics,
    useCart,
    useShopifyCookies
} from '@shopify/hydrogen-react';
import type { CartLine, CurrencyCode } from '@shopify/hydrogen-react/storefront-api-types';
import type { ShopifyAddToCartPayload, ShopifyPageViewPayload } from '@shopify/hydrogen-react';

import { Locale } from '../util/Locale';
import { ProductToMerchantsCenterId } from 'src/util/MerchantsCenterId';
import { ShopifyPriceToNumber } from 'src/util/Pricing';
import { ShopifySalesChannel } from '@shopify/hydrogen-react';
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

const shouldSendEvents = () => {
    if (process.env.NODE_ENV === 'development') return false;
    return true;
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

interface useAnalyticsProps {
    shopId: string;
    locale: Locale;
    domain: string;
    pagePropsAnalyticsData: any;
}
export function useAnalytics({ locale, domain, shopId, pagePropsAnalyticsData }: useAnalyticsProps) {
    useShopifyCookies({ hasUserConsent: true, domain: trimDomain(domain) });

    if (!shopId || !domain) {
        console.warn(`Invalid shopId`, shopId);
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
        currency: locale.currency,
        acceptedLanguage: locale.language,
        hasUserConsent: true,
        ...(pagePropsAnalyticsData as any)
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
                        currency: pageAnalytics.currency || cost?.totalAmount?.currencyCode!,
                        value: ShopifyPriceToNumber(0, cost?.totalAmount?.amount, product.price),
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

        if (!shouldSendEvents()) return;

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

        if (!shouldSendEvents()) return;

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

        sendEcommerceEvent({
            event: 'add_to_cart',
            payload: {
                currency: cost?.totalAmount?.currencyCode! || pageAnalytics.currency,
                value: ShopifyPriceToNumber(0, cost?.totalAmount?.amount),
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
