'use client';

import type { ApiConfig } from '@/api/client';
import type { Shop } from '@/api/shop';
import { CartFragment } from '@/api/shopify/cart';
import { ShopProvider } from '@/components/shop/provider';
import { BuildConfig } from '@/utils/build-config';
import { UnknownCommerceProviderError } from '@/utils/errors';
import type { Locale } from '@/utils/locale';
import { createClient, linkResolver } from '@/utils/prismic';
import { PrismicProvider } from '@prismicio/react';
import { CartProvider, ShopifyProvider } from '@shopify/hydrogen-react';
import type { Localization } from '@shopify/hydrogen-react/storefront-api-types';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';

export default function ProvidersRegistry({
    shop,
    localization,
    locale,
    children
}: {
    shop: Shop;
    localization?: Localization;
    locale: Locale;
    apiConfig: ApiConfig;
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

    return (
        <PrismicProvider client={createClient({ shop, locale })} linkResolver={linkResolver}>
            <ShopProvider shop={shop} currency={localization?.country.currency.isoCode || 'USD'} locale={locale}>
                <ShopifyProvider
                    storefrontId={id}
                    storeDomain={`https://${domain}`}
                    storefrontApiVersion={BuildConfig.shopify.api}
                    storefrontToken={token}
                    countryIsoCode={locale.country!}
                    languageIsoCode={locale.language}
                >
                    <CartProvider
                        cartFragment={CartFragment}
                        languageCode={locale.language}
                        countryCode={locale.country}
                    >
                        {children}

                        <Toaster
                            theme="dark"
                            position="bottom-left"
                            expand={true}
                            duration={5000}
                            gap={4}
                            toastOptions={{
                                classNames: {
                                    toast: 'toast-notification'
                                }
                            }}
                        />
                    </CartProvider>
                </ShopifyProvider>
            </ShopProvider>
        </PrismicProvider>
    );
}
