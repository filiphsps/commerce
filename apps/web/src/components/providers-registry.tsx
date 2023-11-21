'use client';

import { createClient, linkResolver } from '@/prismic';
import { CartProvider, ShopifyProvider } from '@shopify/hydrogen-react';

import type { ApiConfig } from '@/api/client';
import type { Shop } from '@/api/shop';
import { CartFragment } from '@/api/shopify/cart';
import { HeaderProvider } from '@/components/Header/header-provider';
import ApiProvider from '@/components/api-provider';
import StyledComponentsProvider from '@/components/styled-components-provider';
import type { StoreModel } from '@/models/StoreModel';
import { BuildConfig } from '@/utils/build-config';
import { UnknownCommerceProviderError } from '@/utils/errors';
import type { Locale } from '@/utils/locale';
import { PrismicProvider } from '@prismicio/react';
import type { ReactNode } from 'react';
//import { PrismicPreview } from '@prismicio/next';

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
    const toolbar = null; // TODO: <PrismicPreview repositoryName={Prismic.repositoryName} />.

    return (
        <StyledComponentsProvider>
            <PrismicProvider client={createClient({ shop, locale })} linkResolver={linkResolver}>
                <ShopifyProvider
                    storefrontId={id}
                    storeDomain={`https://${domain}`}
                    storefrontApiVersion={BuildConfig.shopify.api}
                    storefrontToken={token}
                    countryIsoCode={locale.country}
                    languageIsoCode={locale.language}
                >
                    <CartProvider cartFragment={CartFragment}>
                        <ApiProvider apiConfig={apiConfig}>
                            <HeaderProvider store={store}>
                                {children}
                                {toolbar}
                            </HeaderProvider>
                        </ApiProvider>
                    </CartProvider>
                </ShopifyProvider>
            </PrismicProvider>
        </StyledComponentsProvider>
    );
}
