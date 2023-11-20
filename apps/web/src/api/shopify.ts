import 'server-only';

import type { ApiConfig } from '@/api/client';
import { setupApi } from '@/api/client';
import { ShopifyApolloApiBuilder } from '@/utils/abstract-api';
import { BuildConfig } from '@/utils/build-config';
import type { Locale } from '@/utils/locale';
import { createStorefrontClient } from '@shopify/hydrogen-react';

export const shopifyApiConfig = ({
    domain = BuildConfig.shopify.checkout_domain
}: {
    domain?: string;
}): {
    public: () => ApiConfig;
    private: () => ApiConfig;
} => {
    //TODO: This shouldn't be hardcoded, instead we should figure it out from the domain.
    if (domain.endsWith('sweetsideofsweden.com')) domain = BuildConfig.shopify.checkout_domain;
    else if (domain === 'demo.nordcom.io') domain = 'mock.shop';

    let publicToken = BuildConfig.shopify.token;
    if (domain === 'demo.nordcom.io') publicToken = 'mock-token';

    let privateToken = BuildConfig.shopify.private_token;
    if (domain === 'demo.nordcom.io') privateToken = 'mock-token';

    const api = createStorefrontClient({
        publicStorefrontToken: publicToken,
        privateStorefrontToken: privateToken,
        storeDomain: `https://${domain}`,
        storefrontApiVersion: BuildConfig.shopify.api
    });

    return {
        public: () => ({
            uri: api.getStorefrontApiUrl(),
            headers: api.getPublicTokenHeaders()
        }),
        private: () => ({
            uri: api.getStorefrontApiUrl(),
            headers: api.getPrivateTokenHeaders()
        })
    };
};

export const StorefrontApiClient = ({ domain, locale }: { domain?: string; locale: Locale }) =>
    ShopifyApolloApiBuilder({
        api: setupApi(shopifyApiConfig({ domain }).private()).getClient(),
        locale
    });
