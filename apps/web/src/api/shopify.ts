import 'server-only';

import type { ApiConfig } from '@/api/client';
import { setupApi } from '@/api/client';
import { ShopifyApolloApiBuilder } from '@/utils/abstract-api';
import { BuildConfig } from '@/utils/build-config';
import type { Locale } from '@/utils/locale';
import { createStorefrontClient } from '@shopify/hydrogen-react';
import { headers } from 'next/headers';

export const shopifyApiConfig = ({
    domain = BuildConfig.shopify.checkout_domain,
    noHeaders = false
}: {
    domain?: string;
    noHeaders?: boolean;
}): {
    public: () => ApiConfig;
    private: () => ApiConfig;
} => {
    let shopifyDomain = BuildConfig.shopify.checkout_domain;
    if (domain === 'demo.nordcom.io') shopifyDomain = 'mock.shop';

    let publicToken = BuildConfig.shopify.token;
    if (domain === 'demo.nordcom.io') publicToken = 'mock-token';

    let privateToken = BuildConfig.shopify.private_token;
    if (domain === 'demo.nordcom.io') privateToken = 'mock-token';

    const api = createStorefrontClient({
        publicStorefrontToken: publicToken,
        privateStorefrontToken: privateToken,
        storeDomain: `https://${shopifyDomain}`,
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

export const StorefrontApiClient = ({ domain, locale }: { domain?: string; locale: Locale }) =>
    ShopifyApolloApiBuilder({
        locale,
        domain,
        api: setupApi(shopifyApiConfig({ domain }).private()).getClient()
    });
