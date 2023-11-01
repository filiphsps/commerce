import 'server-only';

import type { ApiConfig } from '@/api/client';
import { BuildConfig } from '@/utils/build-config';
import type { Locale } from '@/utils/locale';
import { ShopifyApolloApiBuilder } from '@/utils/abstract-api';
import { createStorefrontClient } from '@shopify/hydrogen-react';
import { setupApi } from '@/api/client';

export const shopifyApiConfig = (): {
    public: () => ApiConfig;
    private: () => ApiConfig;
} => {
    const api = createStorefrontClient({
        publicStorefrontToken: BuildConfig.shopify.token,
        privateStorefrontToken: BuildConfig.shopify.private_token,
        storeDomain: `https://${BuildConfig.shopify.checkout_domain}`,
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

export const StorefrontApiClient = ({ locale }: { locale: Locale }) =>
    ShopifyApolloApiBuilder({
        api: setupApi(shopifyApiConfig().private()).getClient(),
        locale
    });
