'use client';

import * as Prismic from '@/prismic';

import { createClient, linkResolver } from '@/prismic';
import { CartProvider, ShopifyProvider } from '@shopify/hydrogen-react';

import { CartFragment } from '@/api/cart';
import type { ApiConfig } from '@/api/client';
import { BuildConfig } from '@/utils/build-config';
import type { Locale } from '@/utils/locale';
import { PrismicPreview } from '@prismicio/next';
import { PrismicProvider } from '@prismicio/react';
import type { ReactNode } from 'react';
import { HeaderProvider } from './Header/header-provider';
import ApiProvider from './api-provider';
import StyledComponentsRegistry from './styled-components-registry';

export default function ProvidersRegistry({
    children,
    locale,
    apiConfig
}: {
    children: ReactNode;
    locale: Locale;
    apiConfig: ApiConfig;
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
                            <HeaderProvider>
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
