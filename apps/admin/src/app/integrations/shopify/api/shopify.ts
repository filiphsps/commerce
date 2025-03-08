import '@shopify/shopify-api/adapters/cf-worker';

import { ApiVersion, shopifyApi } from '@shopify/shopify-api';

export const shopifyAdminApi = shopifyApi({
    userAgentPrefix: 'nordcom',

    apiKey: (process.env.SHOPIFY_API_KEY as string) || '',
    apiSecretKey: (process.env.SHOPIFY_API_SECRET_KEY as string) || '',
    scopes: [
        'read_products',
        'read_orders',
        'write_orders',
        'read_all_orders',
        'write_customer_payment_methods',
        'read_own_subscription_contracts',
        'write_own_subscription_contracts'
    ],
    hostName:
        process.env.NODE_ENV === 'development'
            ? 'localhost:3000'
            : (process.env.ADMIN_DOMAIN as string) || 'admin.shops.nordcom.io',
    isEmbeddedApp: true,
    apiVersion: ApiVersion.October23
});
