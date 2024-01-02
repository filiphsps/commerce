import '@shopify/shopify-api/adapters/web-api';

import { LATEST_API_VERSION, shopifyApi } from '@shopify/shopify-api';

export const shopifyAdminApi = shopifyApi({
    apiKey: process.env.SHOPIFY_API_KEY as string,
    apiSecretKey: process.env.SHOPIFY_API_SECRET_KEY as string,
    scopes: ['read_products'],
    hostName: 'nordcom-commerce',
    apiVersion: LATEST_API_VERSION,
    isEmbeddedApp: true
});
