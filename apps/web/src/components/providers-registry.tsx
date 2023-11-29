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
import * as Prismic from '@/utils/prismic';
import { PrismicPreview } from '@prismicio/next';
import { PrismicProvider } from '@prismicio/react';
import { useEffect, useState, type ReactNode } from 'react';
import { AnalyticsProvider } from './analytics-provider';

export default function ProvidersRegistry({
    shop,
    locale,
    apiConfig,
    store,
    children
}: {
    shop: Shop;
    locale: Locale;
    apiConfig: ApiConfig;
    store: StoreModel;
    children: ReactNode;
}) {
    const [afterLoad, setAfterLoad] = useState<ReactNode>(null);
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (afterLoad) return;

            setAfterLoad(() => (
                <>
                    <PrismicPreview repositoryName={Prismic.repositoryName} />
                </>
            ));

            // Wait 10 seconds to prevent the lighthouse score from being affected by the preview toolbar
        }, 10_000);

        return () => clearTimeout(timeout);
    }, []);

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
                        <HeaderProvider store={store}>
                            <AnalyticsProvider shop={shop} locale={locale}>
                                {children}

                                {afterLoad}
                            </AnalyticsProvider>
                        </HeaderProvider>
                    </CartProvider>
                </ShopifyProvider>
            </PrismicProvider>
        </StyledComponentsProvider>
    );
}
