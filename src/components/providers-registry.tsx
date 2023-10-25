'use client';

import { CartProvider, ShopifyProvider } from '@shopify/hydrogen-react';

import { CartFragment } from '@/api/cart';
import { Config } from '@/utils/config';
import type { Locale } from '@/utils/locale';
import React from 'react';

export default function ProvidersRegistry({ children, locale }: { children: React.ReactNode; locale: Locale }) {
    return (
        <ShopifyProvider
            storefrontId={Config.shopify.storefront_id}
            storeDomain={`https://${Config.shopify.checkout_domain}`}
            storefrontApiVersion={Config.shopify.api}
            storefrontToken={Config.shopify.token}
            countryIsoCode={locale.country}
            languageIsoCode={locale.language}
        >
            <CartProvider cartFragment={CartFragment}>{children}</CartProvider>
        </ShopifyProvider>
    );
}
