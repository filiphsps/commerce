'use client';

import type { OnlineShop } from '@nordcom/commerce-db';
import { UnknownCommerceProviderError, UnknownContentProviderError } from '@nordcom/commerce-errors';

import { CartFragment } from '@/api/shopify/cart';
import { createClient } from '@/utils/prismic';
import { PrismicToolbar } from '@prismicio/react';
import { CartProvider, ShopifyProvider } from '@shopify/hydrogen-react';
import { Toaster as ToasterProvider } from 'sonner';

import { PrismicRegistry } from '@/components/prismic-registry';
import { ShopProvider } from '@/components/shop/provider';
import { Toolbars } from '@/components/toolbars';

import type { CurrencyCode, Locale } from '@/utils/locale';
import type { ReactNode } from 'react';

const CommerceProvider = ({ shop, locale, children }: { shop: OnlineShop; locale: Locale; children: ReactNode }) => {
    switch (shop.commerceProvider.type) {
        case 'shopify': {
            if (!shop.commerceProvider.domain) {
                throw new UnknownCommerceProviderError();
            }

            return (
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
            );
        }
        default: {
            throw new UnknownCommerceProviderError();
        }
    }
};

const ContentProvider = ({
    shop,
    domain,
    locale,
    children
}: {
    shop: OnlineShop;
    domain: string;
    locale: Locale;
    children: ReactNode;
}) => {
    switch (shop.contentProvider.type) {
        case 'prismic': {
            return (
                <PrismicRegistry client={createClient({ shop, locale })}>
                    {children}

                    <Toolbars domain={domain}>
                        <PrismicToolbar repositoryName={shop.contentProvider.repositoryName} />
                    </Toolbars>
                </PrismicRegistry>
            );
        }
        case 'shopify': {
            // TODO: Handle this.
            return (
                <>
                    {children}

                    <Toolbars domain={domain} />
                </>
            );
        }
        default: {
            throw new UnknownContentProviderError(shop.contentProvider);
        }
    }
};

const ProvidersRegistry = ({
    shop,
    currency = 'USD',
    domain,
    locale,
    children
}: {
    shop: OnlineShop;
    domain: string;
    currency?: CurrencyCode;
    locale: Locale;
    children: ReactNode;
}) => {
    return (
        <ShopProvider shop={shop} currency={currency} locale={locale}>
            <CommerceProvider shop={shop} locale={locale}>
                <ContentProvider shop={shop} locale={locale} domain={domain}>
                    <CartProvider
                        cartFragment={CartFragment}
                        languageCode={locale.language}
                        countryCode={locale.country!}
                    >
                        {children}

                        <ToasterProvider
                            theme="dark"
                            position="bottom-left"
                            expand={true}
                            duration={5000}
                            gap={4}
                            visibleToasts={2}
                            pauseWhenPageIsHidden={true}
                            toastOptions={{
                                duration: 2500,
                                classNames: {
                                    toast: 'toast-notification'
                                }
                            }}
                        />
                    </CartProvider>
                </ContentProvider>
            </CommerceProvider>
        </ShopProvider>
    );
};
export default ProvidersRegistry;
