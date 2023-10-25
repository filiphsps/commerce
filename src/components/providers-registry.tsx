'use client';

import { CartProvider, ShopifyProvider } from '@shopify/hydrogen-react';

import { CartFragment } from '@/api/cart';
import { createClient, linkResolver, repositoryName } from '@/prismic';
import { Config } from '@/utils/config';
import type { Locale } from '@/utils/locale';
import { PrismicProvider, PrismicToolbar } from '@prismicio/react';
import type { ReactNode } from 'react';

export default function ProvidersRegistry({ children, locale }: { children: ReactNode; locale: Locale }) {
    return (
        <PrismicProvider client={createClient({ locale })} linkResolver={linkResolver}>
            <ShopifyProvider
                storefrontId={Config.shopify.storefront_id}
                storeDomain={`https://${Config.shopify.checkout_domain}`}
                storefrontApiVersion={Config.shopify.api}
                storefrontToken={Config.shopify.token}
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
