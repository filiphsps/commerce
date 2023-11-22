import 'server-only';

import type { ApiConfig } from '@/api/client';
import { setupApi } from '@/api/client';
import { CommerceProviderAuthenticationApi, type Shop } from '@/api/shop';
import { ShopifyApolloApiBuilder } from '@/utils/abstract-api';
import { BuildConfig } from '@/utils/build-config';
import type { Locale } from '@/utils/locale';
import { createStorefrontClient } from '@shopify/hydrogen-react';
import { headers } from 'next/headers';

export const shopifyApiConfig = async ({
    shop,
    noHeaders = true
}: {
    shop: Shop;
    noHeaders?: boolean;
}): Promise<{
    public: () => ApiConfig;
    private: () => ApiConfig;
}> => {
    const { token, publicToken } = await CommerceProviderAuthenticationApi({ shop });
    const api = createStorefrontClient({
        publicStorefrontToken: publicToken,
        privateStorefrontToken: token || undefined,
        storeDomain: shop.configuration.commerce.domain,
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

export const StorefrontApiClient = async ({
    shop,
    locale,
    apiConfig
}: {
    shop: Shop;
    locale: Locale;
    apiConfig?: Awaited<ReturnType<typeof shopifyApiConfig>>;
}) =>
    ShopifyApolloApiBuilder({
        shop,
        locale,
        api: setupApi((apiConfig || (await shopifyApiConfig({ shop }))).private()).getClient()
    });
