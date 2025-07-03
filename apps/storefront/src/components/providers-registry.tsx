'use client';

import { Fragment, type ReactNode, Suspense, useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import type { OnlineShop } from '@nordcom/commerce-db';
import { UnknownCommerceProviderError, UnknownContentProviderError } from '@nordcom/commerce-errors';

import { CartFragment } from '@/api/shopify/cart';
import { useCartUtils } from '@/hooks/useCartUtils';
import { BuildConfig } from '@/utils/build-config';
import { isPreviewEnv } from '@/utils/is-preview-env';
import { createClient } from '@/utils/prismic';
import { PrismicPreview } from '@prismicio/next';
import { CartProvider, ShopifyProvider } from '@shopify/hydrogen-react';
import { Toaster as ToasterProvider } from 'sonner';

import { LiveChatProvider } from '@/components/live-chat-provider';
import { PrismicRegistry } from '@/components/prismic-registry';
import { ShopProvider } from '@/components/shop/provider';
import { Toolbars } from '@/components/toolbars';

import type { CurrencyCode, Locale } from '@/utils/locale';

const RequiredHooks = ({ locale, children = null }: { shop: OnlineShop; locale: Locale; children?: ReactNode }) => {
    const {} = useCartUtils({ locale });

    return children;
};

const CommerceProvider = ({ shop, locale, children }: { shop: OnlineShop; locale: Locale; children: ReactNode }) => {
    switch (shop.commerceProvider.type) {
        case 'shopify': {
            if (!shop.commerceProvider.domain) {
                throw new UnknownCommerceProviderError();
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
                    {children as any}
                </ShopifyProvider>
            );
        }
        default: {
            throw new UnknownCommerceProviderError(shop.commerceProvider.type);
        }
    }
};

const ContentProvider = ({
    shop,
    locale,
    children
}: {
    shop: OnlineShop;
    domain: string;
    locale: Locale;
    children: ReactNode;
}) => {
    const [isInternalTraffic, setIsInternalTraffic] = useState(false);
    useEffect(() => {
        if (!(window as any).localStorage) {
            return;
        }

        // Use vercel toolbar to determine internal traffic.
        // TODO: This should be some form of a utility function.
        const value = localStorage.getItem('__vercel_toolbar');
        if (value !== '1' || (!Number.isNaN(value) && Number.parseInt(value) >= 1)) {
            return;
        }

        setIsInternalTraffic(true);
    }, []);

    switch (shop.contentProvider.type) {
        case 'prismic': {
            return (
                <PrismicRegistry client={createClient({ shop, locale })}>
                    {children as any}

                    {isPreviewEnv('domain') || isInternalTraffic ? (
                        <PrismicPreview repositoryName={shop.contentProvider.repositoryName} />
                    ) : null}
                </PrismicRegistry>
            );
        }
        case 'shopify': {
            // TODO: Handle this.
            return <>{children as any}</>;
        }
        default: {
            throw new UnknownContentProviderError(shop.contentProvider.type);
        }
    }
};

const ProvidersRegistry = ({
    shop,
    currency = 'USD',
    domain,
    locale,
    children,
    toolbars = true
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
                            countryCode={locale.country!}
                        >
                            <ErrorBoundary fallbackRender={() => null}>
                                <Suspense fallback={<Fragment />}>
                                    <RequiredHooks shop={shop} locale={locale} />
                                </Suspense>

                                {toolbars ? (
                                    <Suspense fallback={children as any}>
                                        <LiveChatProvider shop={shop} locale={locale}>
                                            {children as any}
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
                                                    toast: 'toast-notification'
                                                }
                                            }}
                                        />

                                        <Toolbars domain={domain} />
                                    </Suspense>
                                ) : (
                                    (children as any)
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
