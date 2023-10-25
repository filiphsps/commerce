'use client';

import { CartProvider, ShopifyProvider } from '@shopify/hydrogen-react';

import { CartFragment } from '@/api/cart';
import { createClient, linkResolver, repositoryName } from '@/prismic';
import { BuildConfig } from '@/utils/build-config';
import type { Locale } from '@/utils/locale';
import { PrismicProvider, PrismicToolbar } from '@prismicio/react';
import type { ReactNode } from 'react';

export default function ProvidersRegistry({ children, locale }: { children: ReactNode; locale: Locale }) {
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
                    {children}
                    <PrismicToolbar repositoryName={repositoryName} />
                </CartProvider>
            </ShopifyProvider>
        </PrismicProvider>
    );
}
