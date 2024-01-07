import '@shopify/shopify-api/adapters/cf-worker';

import { ApiVersion, shopifyApi } from '@shopify/shopify-api';
import { restResources } from '@shopify/shopify-api/rest/admin/2023-10';

export const shopifyAdminApi = shopifyApi({
    apiKey: process.env.SHOPIFY_API_KEY as string,
    apiSecretKey: process.env.SHOPIFY_API_SECRET_KEY as string,
    scopes: ['read_products'],
    hostName: 'nordcom-commerce',
    apiVersion: ApiVersion.October23,
    isEmbeddedApp: true,
    restResources
});
