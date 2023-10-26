'use client';

import { CartProvider, ShopifyProvider } from '@shopify/hydrogen-react';

import { CartFragment } from '@/api/cart';
import type { ApiConfig } from '@/api/client';
import { createClient, linkResolver, repositoryName } from '@/prismic';
import { BuildConfig } from '@/utils/build-config';
import type { Locale } from '@/utils/locale';
import { PrismicProvider, PrismicToolbar } from '@prismicio/react';
import type { ReactNode } from 'react';
import ApiProvider from './api-provider';

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
                        {children}
                        <PrismicToolbar repositoryName={repositoryName} />
                    </ApiProvider>
                </CartProvider>
            </ShopifyProvider>
        </PrismicProvider>
    );
}
