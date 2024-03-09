'use client';

import { CartFragment } from '@/api/shopify/cart';
import { ShopProvider } from '@/components/shop/provider';
import { BuildConfig } from '@/utils/build-config';
import { createClient, linkResolver } from '@/utils/prismic';
import { UnknownCommerceProviderError, UnknownContentProviderError } from '@nordcom/commerce-errors';
import { PrismicProvider } from '@prismicio/react';
import { CartProvider, ShopifyProvider } from '@shopify/hydrogen-react';
import { Toaster as ToaserProvider } from 'sonner';

import type { CurrencyCode, Locale } from '@/utils/locale';
import type { Shop } from '@nordcom/commerce-database';
import type { ReactNode } from 'react';

const CommerceProvider = ({
    shop,
    currency,
    locale,
    children
}: {
    shop: Shop;
    currency: CurrencyCode;
    locale: Locale;
    children: ReactNode;
}) => {
    switch (shop.commerceProvider?.type) {
        case 'shopify':
            return (
                <ShopProvider shop={shop} currency={currency} locale={locale}>
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

const ProvidersRegistry = ({
    shop,
    currency,
    locale,
    children
}: {
    shop: Shop;
    currency: CurrencyCode;
    locale: Locale;
    children: ReactNode;
}) => {
    return (
        <ContentProvider shop={shop} locale={locale}>
            <CommerceProvider shop={shop} currency={currency} locale={locale}>
                <CartProvider cartFragment={CartFragment} languageCode={locale.language} countryCode={locale.country!}>
                    {children}

                    <ToaserProvider
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
};
export default ProvidersRegistry;
