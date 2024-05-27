'use client';

import type { Shop } from '@nordcom/commerce-database';
import { UnknownCommerceProviderError, UnknownContentProviderError } from '@nordcom/commerce-errors';

import { CartFragment } from '@/api/shopify/cart';
import { createClient, linkResolver } from '@/utils/prismic';
import { PrismicProvider } from '@prismicio/react';
import { CartProvider, ShopifyProvider } from '@shopify/hydrogen-react';
import { Toaster as ToasterProvider } from 'sonner';

import { ShopProvider } from '@/components/shop/provider';

import type { CurrencyCode, Locale } from '@/utils/locale';
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
    switch (shop.commerceProvider.type) {
        case 'shopify':
            return (
                <ShopProvider shop={shop} currency={currency} locale={locale}>
                    <ShopifyProvider
                        storefrontId={shop.commerceProvider.storefrontId}
                        storeDomain={`https://${shop.commerceProvider.domain}`}
                        storefrontApiVersion="2024-04"
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
    switch (shop.contentProvider.type) {
        case 'prismic':
            return (
                <PrismicProvider client={createClient({ shop, locale })} linkResolver={linkResolver}>
                    {children}
                </PrismicProvider>
            );
        case 'shopify': // TODO: Handle this.
            return children;
        default:
            throw new UnknownContentProviderError(shop.contentProvider);
    }
};

const ProvidersRegistry = ({
    shop,
    currency = 'USD',
    locale,
    children
}: {
    shop: Shop;
    currency?: CurrencyCode;
    locale: Locale;
    children: ReactNode;
}) => {
    return (
        <ContentProvider shop={shop} locale={locale}>
            <CommerceProvider shop={shop} currency={currency} locale={locale}>
                <CartProvider cartFragment={CartFragment} languageCode={locale.language} countryCode={locale.country!}>
                    {children}

                    <ToasterProvider
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
