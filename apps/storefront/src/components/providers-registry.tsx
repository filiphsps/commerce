'use client';

import { ErrorBoundary } from 'react-error-boundary';

import type { OnlineShop } from '@nordcom/commerce-db';
import { UnknownCommerceProviderError, UnknownContentProviderError } from '@nordcom/commerce-errors';

import { CartFragment } from '@/api/shopify/cart';
import { BuildConfig } from '@/utils/build-config';
import { createClient } from '@/utils/prismic';
import { CartProvider, ShopifyProvider } from '@shopify/hydrogen-react';
import { Toaster as ToasterProvider } from 'sonner';

import { PrismicRegistry } from '@/components/prismic-registry';
import { ShopProvider } from '@/components/shop/provider';
import { Toolbars } from '@/components/toolbars';

import type { CurrencyCode, Locale } from '@/utils/locale';
import type { ReactNode } from 'react';

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
                    {children}
                </ShopifyProvider>
            );
        }
        default: {
            throw new UnknownCommerceProviderError();
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
    switch (shop.contentProvider.type) {
        case 'prismic': {
            return (
                <PrismicRegistry client={createClient({ shop, locale })}>
                    {children}

                    {/* TODO: Enable this for Prismic storefronts. */}
                    {/*<PrismicToolbar repositoryName={shop.contentProvider.repositoryName} />*/}
                </PrismicRegistry>
            );
        }
        case 'shopify': {
            // TODO: Handle this.
            return <>{children}</>;
        }
        default: {
            throw new UnknownContentProviderError(shop.contentProvider);
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
                                {children}

                                {toolbars ? (
                                    <>
                                        <ToasterProvider
                                            theme="dark"
                                            position="bottom-left"
                                            expand={true}
                                            duration={5000}
                                            gap={4}
                                            visibleToasts={2}
                                            pauseWhenPageIsHidden={true}
                                            toastOptions={{
                                                duration: 2500,
                                                classNames: {
                                                    toast: 'toast-notification'
                                                }
                                            }}
                                        />
                                        <Toolbars domain={domain} />
                                    </>
                                ) : null}
                            </ErrorBoundary>
                        </CartProvider>
                    </ContentProvider>
                </CommerceProvider>
            </ShopProvider>
        </ErrorBoundary>
    );
};
export default ProvidersRegistry;
