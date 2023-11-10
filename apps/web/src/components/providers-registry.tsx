'use client';

import * as Prismic from '@/prismic';

import { createClient, linkResolver } from '@/prismic';
import { CartProvider, ShopifyProvider } from '@shopify/hydrogen-react';

import { CartFragment } from '@/api/cart';
import type { ApiConfig } from '@/api/client';
import { HeaderProvider } from '@/components/Header/header-provider';
import ApiProvider from '@/components/api-provider';
import StyledComponentsRegistry from '@/components/styled-components-registry';
import type { StoreModel } from '@/models/StoreModel';
import { BuildConfig } from '@/utils/build-config';
import type { Locale } from '@/utils/locale';
import { PrismicPreview } from '@prismicio/next';
import { PrismicProvider } from '@prismicio/react';
import type { ReactNode } from 'react';

export default function ProvidersRegistry({
    children,
    locale,
    apiConfig,
    store
}: {
    children: ReactNode;
    locale: Locale;
    apiConfig: ApiConfig;
    store: StoreModel;
}) {
    const {
        storefront_id: storefrontId,
        token: storefrontToken,
        checkout_domain: storeDomain,
        api: storefrontVersion
    } = BuildConfig.shopify;
    const toolbar = (BuildConfig.prismic.toolbar && <PrismicPreview repositoryName={Prismic.repositoryName} />) || null;

    return (
        <StyledComponentsRegistry>
            <PrismicProvider client={createClient({ locale })} linkResolver={linkResolver}>
                <ShopifyProvider
                    storefrontId={storefrontId}
                    storeDomain={`https://${storeDomain}`}
                    storefrontApiVersion={storefrontVersion}
                    storefrontToken={storefrontToken}
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
        </StyledComponentsRegistry>
    );
}
