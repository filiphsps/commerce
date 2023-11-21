import 'server-only';

import type { ApiConfig } from '@/api/client';
import { setupApi } from '@/api/client';
import type { Shop } from '@/api/shop';
import { ShopifyApolloApiBuilder } from '@/utils/abstract-api';
import { BuildConfig } from '@/utils/build-config';
import { UnknownCommerceProviderError } from '@/utils/errors';
import type { Locale } from '@/utils/locale';
import { createStorefrontClient } from '@shopify/hydrogen-react';
import { headers } from 'next/headers';

export const shopifyApiConfig = ({
    shop,
    noHeaders = true
}: {
    shop: Shop;
    noHeaders?: boolean;
}): {
    public: () => ApiConfig;
    private: () => ApiConfig;
} => {
    let domain, token, publicToken;
    switch (shop.configuration.commerce.type) {
        case 'shopify':
            domain = shop.configuration.commerce.domain;
            token = shop.configuration.commerce.authentication.token;
            publicToken = shop.configuration.commerce.authentication.publicToken;
            break;
        case 'dummy':
            domain = 'mock.shop';
            token = 'mock-token';
            publicToken = 'mock-token';
            break;
        default:
            throw new UnknownCommerceProviderError();
    }

    const api = createStorefrontClient({
        publicStorefrontToken: publicToken,
        privateStorefrontToken: token,
        storeDomain: `https://${domain}`,
        storefrontApiVersion: BuildConfig.shopify.api,
        contentType: 'json'
    });

    let buyerIp: string | undefined = undefined;
    if (!noHeaders) {
        const clientHeaders = headers();
        buyerIp =
            clientHeaders.get('cf-connecting-ip') ||
            clientHeaders.get('x-forwarded-for') ||
            clientHeaders.get('x-real-ip') ||
            undefined;
    }

    return {
        public: () => ({
            uri: api.getStorefrontApiUrl(),
            headers: api.getPublicTokenHeaders()
        }),
        private: () => ({
            uri: api.getStorefrontApiUrl(),
            headers: api.getPrivateTokenHeaders({ buyerIp })
        })
    };
};

export const StorefrontApiClient = ({
    shop,
    locale,
    apiConfig
}: {
    shop: Shop;
    locale: Locale;
    apiConfig?: ReturnType<typeof shopifyApiConfig>;
}) =>
    ShopifyApolloApiBuilder({
        shop,
        locale,
        api: setupApi((apiConfig || shopifyApiConfig({ shop })).private()).getClient()
    });
