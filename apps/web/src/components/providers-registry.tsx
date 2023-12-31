'use client';

import type { ApiConfig } from '@/api/client';
import type { Shop } from '@/api/shop';
import { CartFragment } from '@/api/shopify/cart';
import { ShopProvider } from '@/components/shop/provider';
import { BuildConfig } from '@/utils/build-config';
import { UnknownCommerceProviderError, UnknownContentProviderError } from '@/utils/errors';
import type { Locale } from '@/utils/locale';
import { createClient, linkResolver } from '@/utils/prismic';
import { PrismicProvider } from '@prismicio/react';
import { CartProvider, ShopifyProvider } from '@shopify/hydrogen-react';
import type { Localization } from '@shopify/hydrogen-react/storefront-api-types';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';

const ContentProvider = ({ shop, locale, children }: { shop: Shop; locale: Locale; children: ReactNode }) => {
    switch (shop.contentProvider?.type) {
        case 'prismic':
            return (
                <PrismicProvider client={createClient({ shop, locale })} linkResolver={linkResolver}>
                    {children}
                </PrismicProvider>
            );
        case 'shopify':
            return <>{children}</>;
        default:
            throw new UnknownContentProviderError();
    }
};

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
    switch (shop.commerceProvider.type) {
        case 'shopify':
            domain = shop.commerceProvider.domain;
            id = shop.commerceProvider.storefrontId;
            token = shop.commerceProvider.authentication.publicToken;
            break;
        default:
            throw new UnknownCommerceProviderError();
    }

    return (
        <ContentProvider shop={shop} locale={locale}>
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
        </ContentProvider>
    );
}
