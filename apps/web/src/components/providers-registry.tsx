'use client';

import type { ApiConfig } from '@/api/client';
import type { Shop } from '@/api/shop';
import { CartFragment } from '@/api/shopify/cart';
import { ShopProvider } from '@/components/shop/provider';
import { BuildConfig } from '@/utils/build-config';
import type { Locale } from '@/utils/locale';
import { createClient, linkResolver } from '@/utils/prismic';
import { UnknownCommerceProviderError, UnknownContentProviderError } from '@nordcom/commerce-errors';
import { PrismicProvider } from '@prismicio/react';
import { CartProvider, ShopifyProvider } from '@shopify/hydrogen-react';
import type { Localization } from '@shopify/hydrogen-react/storefront-api-types';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';

const CommerceProvider = ({
    shop,
    locale,
    localization,
    children
}: {
    shop: Shop;
    locale: Locale;
    localization?: Localization;
    children: ReactNode;
}) => {
    switch (shop.commerceProvider?.type) {
        case 'shopify':
            return (
                <ShopProvider shop={shop} currency={localization?.country.currency.isoCode || 'USD'} locale={locale}>
                    <ShopifyProvider
                        storefrontId={shop.commerceProvider.storefrontId}
                        storeDomain={`https://${shop.commerceProvider.domain}`}
                        storefrontApiVersion={BuildConfig.shopify.api}
                        storefrontToken={shop.commerceProvider.authentication.publicToken}
                        countryIsoCode={locale.country!}
                        languageIsoCode={locale.language}
                    >
                        {children}
                    </ShopifyProvider>
                </ShopProvider>
            );
        default:
            throw new UnknownCommerceProviderError();
    }
};

const ContentProvider = ({ shop, locale, children }: { shop: Shop; locale: Locale; children: ReactNode }) => {
    switch (shop.contentProvider?.type) {
        case 'prismic':
            return (
                <PrismicProvider client={createClient({ shop, locale })} linkResolver={linkResolver}>
                    {children}
                </PrismicProvider>
            );
        case 'shopify': // TODO: Handle this.
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
    return (
        <ContentProvider shop={shop} locale={locale}>
            <CommerceProvider shop={shop} locale={locale} localization={localization}>
                <CartProvider cartFragment={CartFragment} languageCode={locale.language} countryCode={locale.country}>
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
            </CommerceProvider>
        </ContentProvider>
    );
}
