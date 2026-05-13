'use client';

import type { OnlineShop } from '@nordcom/commerce-db';
import { UnknownCommerceProviderError } from '@nordcom/commerce-errors';
import { CartProvider, ShopifyProvider } from '@shopify/hydrogen-react';
import { Fragment, type ReactNode, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Toaster as ToasterProvider } from 'sonner';
import { CartFragment } from '@/api/shopify/cart';
import { LiveChatProvider } from '@/components/live-chat-provider';
import { ShopProvider } from '@/components/shop/provider';
import { Toolbars } from '@/components/toolbars';
import { useCartUtils } from '@/hooks/useCartUtils';
import { BuildConfig } from '@/utils/build-config';
import type { CurrencyCode, Locale } from '@/utils/locale';

const RequiredHooks = ({ locale, children = null }: { shop: OnlineShop; locale: Locale; children?: ReactNode }) => {
    void useCartUtils({ locale });

    return children;
};

const CommerceProvider = ({ shop, locale, children }: { shop: OnlineShop; locale: Locale; children: ReactNode }) => {
    switch (shop.commerceProvider.type) {
        case 'shopify': {
            if (!shop.commerceProvider.domain) {
                // TODO: Surface this as a tenant-config validation error during shop lookup.
                //       For now, render without the Shopify cart provider — content pages still work,
                //       cart/checkout features will be unavailable.
                console.error(
                    `Shop "${shop.domain}" missing commerceProvider.domain — Shopify provider context unavailable.`,
                );
                return <>{children}</>;
            }

            return (
                <ShopifyProvider
                    storefrontId={shop.commerceProvider.storefrontId}
                    storeDomain={`https://${shop.commerceProvider.domain}`}
                    storefrontApiVersion={BuildConfig.shopify.api}
                    storefrontToken={shop.commerceProvider.authentication.publicToken}
                    countryIsoCode={locale.country!}
                    languageIsoCode={locale.language}
                >
                    {children}
                </ShopifyProvider>
            );
        }
        default: {
            throw new UnknownCommerceProviderError(shop.commerceProvider.type);
        }
    }
};

const ContentProvider = ({ children }: { shop: OnlineShop; domain: string; locale: Locale; children: ReactNode }) => {
    // CMS content is fetched via Payload's Local API server-side; there is no
    // client-side provider needed.
    return <>{children}</>;
};

const ProvidersRegistry = ({
    shop,
    currency = 'USD',
    domain,
    locale,
    children,
    toolbars = true,
}: {
    shop: OnlineShop;
    domain: string;
    currency?: CurrencyCode;
    locale: Locale;
    children: ReactNode;
    toolbars?: boolean;
}) => {
    return (
        <ErrorBoundary fallbackRender={() => null}>
            <ShopProvider shop={shop} currency={currency} locale={locale}>
                <CommerceProvider shop={shop} locale={locale}>
                    <ContentProvider shop={shop} locale={locale} domain={domain}>
                        <CartProvider
                            cartFragment={CartFragment}
                            languageCode={locale.language}
                            countryCode={locale.country}
                        >
                            <ErrorBoundary fallbackRender={() => null}>
                                <Suspense fallback={<Fragment />}>
                                    <RequiredHooks shop={shop} locale={locale} />
                                </Suspense>

                                {toolbars ? (
                                    <Suspense fallback={children}>
                                        <LiveChatProvider shop={shop} locale={locale}>
                                            {children}
                                        </LiveChatProvider>

                                        <ToasterProvider
                                            theme="dark"
                                            position="bottom-left"
                                            expand={true}
                                            duration={5000}
                                            gap={4}
                                            visibleToasts={2}
                                            toastOptions={{
                                                duration: 2500,
                                                classNames: {
                                                    toast: 'toast-notification',
                                                },
                                            }}
                                        />

                                        <Toolbars domain={domain} />
                                    </Suspense>
                                ) : (
                                    children
                                )}
                            </ErrorBoundary>
                        </CartProvider>
                    </ContentProvider>
                </CommerceProvider>
            </ShopProvider>
        </ErrorBoundary>
    );
};
export default ProvidersRegistry;
