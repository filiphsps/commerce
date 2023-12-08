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
import type { Locale } from '@/utils/locale';
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
        <StyledComponentsProvider>
            <PrismicProvider client={createClient({ shop, locale })} linkResolver={linkResolver}>
                <ShopifyProvider
                    storefrontId={id}
                    storeDomain={`https://${domain}`}
                    storefrontApiVersion={BuildConfig.shopify.api}
                    storefrontToken={token}
                    countryIsoCode={locale.country!}
                    languageIsoCode={locale.language}
                >
                    <CartProvider cartFragment={CartFragment}>
                        <ShopProvider shop={shop} currency={'USD'}>
                            <HeaderProvider store={store}>
                                <AnalyticsProvider>
                                    <ThirdPartiesProvider shop={shop} locale={locale}>
                                        <Toaster
                                            theme="dark"
                                            position="bottom-left"
                                            closeButton={true}
                                            expand={true}
                                            duration={5000}
                                            gap={4}
                                            toastOptions={{
                                                style: {
                                                    padding: 'var(--block-padding-large)',
                                                    backgroundColor: 'var(--color-accent-primary)',
                                                    borderColor: 'var(--color-accent-primary-dark)',
                                                    borderWidth: 'var(--block-border-width)',
                                                    borderRadius: 'var(--block-border-radius)'
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
    );
}
