'use client';

import * as Prismic from '@/prismic';

import { CartProvider, ShopifyProvider } from '@shopify/hydrogen-react';
import { createClient, linkResolver } from '@/prismic';

import type { ApiConfig } from '@/api/client';
import ApiProvider from './api-provider';
import { BuildConfig } from '@/utils/build-config';
import { CartFragment } from '@/api/cart';
import { HeaderProvider } from './Header/header-provider';
import type { Locale } from '@/utils/locale';
import { PrismicPreview } from '@prismicio/next';
import { PrismicProvider } from '@prismicio/react';
import type { ReactNode } from 'react';
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
    return (
        <StyledComponentsRegistry>
            <PrismicProvider client={createClient({ locale })} linkResolver={linkResolver}>
                <ShopifyProvider
                    storefrontId={BuildConfig.shopify.storefront_id}
                    storeDomain={`https://${BuildConfig.shopify.checkout_domain}`}
                    storefrontApiVersion={BuildConfig.shopify.api}
                    storefrontToken={BuildConfig.shopify.token}
                    countryIsoCode={locale.country}
                    languageIsoCode={locale.language}
                >
                    <CartProvider cartFragment={CartFragment}>
                        <ApiProvider apiConfig={apiConfig}>
                            <HeaderProvider>{children}</HeaderProvider>
                        </ApiProvider>
                    </CartProvider>
                </ShopifyProvider>
                <PrismicPreview repositoryName={Prismic.repositoryName} />
            </PrismicProvider>
        </StyledComponentsRegistry>
    );
}
