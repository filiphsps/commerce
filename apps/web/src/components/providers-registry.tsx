'use client';

import { createClient, linkResolver } from '@/utils/prismic';
import { CartProvider, ShopifyProvider } from '@shopify/hydrogen-react';

import type { ApiConfig } from '@/api/client';
import type { Shop } from '@/api/shop';
import { CartFragment } from '@/api/shopify/cart';
import { HeaderProvider } from '@/components/Header/header-provider';
import StyledComponentsProvider from '@/components/styled-components-provider';
import type { StoreModel } from '@/models/StoreModel';
import { BuildConfig } from '@/utils/build-config';
import { UnknownCommerceProviderError } from '@/utils/errors';
import { Locale } from '@/utils/locale';
import { ErrorBoundary } from '@highlight-run/next/client';
import { PrismicProvider } from '@prismicio/react';
import { useEffect, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { AnalyticsProvider } from './analytics-provider';
import { ShopProvider } from './shop/provider';
import { ThirdPartiesProvider } from './thirdparties-provider';

export default function ProvidersRegistry({
    shop,
    locale,
    store,
    children
}: {
    shop: Shop;
    locale: Locale;
    apiConfig: ApiConfig;
    store: StoreModel;
    children: ReactNode;
}) {
    // Set the locale globally for the client.
    useEffect(() => {
        if (typeof window === 'undefined' || !locale) return;

        window.locale = locale.code;
    }, [, locale]);

    let domain, token, id;
    switch (shop.configuration.commerce.type) {
        case 'shopify':
            domain = shop.configuration.commerce.domain;
            id = shop.configuration.commerce.storefrontId;
            token = shop.configuration.commerce.authentication.publicToken;
            break;
        case 'dummy':
            domain = 'mock.shop';
            (id = 'hello-world'), (token = 'mock-token');
            break;
        default:
            throw new UnknownCommerceProviderError();
    }

    return (
        <ErrorBoundary
            // TODO: Show the dialog.
            showDialog={false}
        >
            <StyledComponentsProvider>
                <PrismicProvider client={createClient({ shop, locale })} linkResolver={linkResolver}>
                    <ShopifyProvider
                        storefrontId={id}
                        storeDomain={`https://${domain}`}
                        storefrontApiVersion={BuildConfig.shopify.api}
                        storefrontToken={token}
                        countryIsoCode={(locale.country || Locale.default.country)!}
                        languageIsoCode={locale.language}
                    >
                        <CartProvider
                            cartFragment={CartFragment}
                            languageCode={locale.language}
                            countryCode={locale.country}
                        >
                            <ShopProvider shop={shop} currency={'USD'} locale={locale}>
                                <HeaderProvider store={store}>
                                    <AnalyticsProvider shop={shop}>
                                        <ThirdPartiesProvider shop={shop} locale={locale}>
                                            <Toaster
                                                theme="dark"
                                                position="bottom-left"
                                                closeButton={true}
                                                expand={true}
                                                duration={5000}
                                                gap={4}
                                                toastOptions={{
                                                    classNames: {
                                                        toast: 'toast-notification'
                                                    }
                                                }}
                                            />
                                            {children}
                                        </ThirdPartiesProvider>
                                    </AnalyticsProvider>
                                </HeaderProvider>
                            </ShopProvider>
                        </CartProvider>
                    </ShopifyProvider>
                </PrismicProvider>
            </StyledComponentsProvider>
        </ErrorBoundary>
    );
}
