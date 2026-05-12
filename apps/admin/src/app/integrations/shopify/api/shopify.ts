import '@shopify/shopify-api/adapters/cf-worker';

import { ApiVersion, shopifyApi } from '@shopify/shopify-api';

import { ADMIN_DOMAIN } from '@/utils/domains';

const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecretKey = process.env.SHOPIFY_API_SECRET_KEY;

export const isShopifyConfigured = Boolean(apiKey && apiSecretKey);

// Initialising `shopifyApi()` with empty credentials throws synchronously, which crashes
// the admin build for tenants who haven't onboarded Shopify yet. Skip init when missing
// and let consumers null-check to return a graceful "integration disabled" response.
export const shopifyAdminApi = isShopifyConfigured
    ? shopifyApi({
          userAgentPrefix: 'nordcom',

          apiKey: apiKey as string,
          apiSecretKey: apiSecretKey as string,
          scopes: [
              'read_products',
              'read_orders',
              'write_orders',
              'read_all_orders',
              'write_customer_payment_methods',
              'read_own_subscription_contracts',
              'write_own_subscription_contracts',
          ],
          hostName: ADMIN_DOMAIN,
          isEmbeddedApp: true,
          apiVersion: ApiVersion.October23,
      })
    : null;

if (!isShopifyConfigured) {
    console.warn(
        '[integrations/shopify] SHOPIFY_API_KEY and/or SHOPIFY_API_SECRET_KEY are not set — Shopify integration is disabled.',
    );
}
