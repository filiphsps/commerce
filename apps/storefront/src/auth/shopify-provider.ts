import type { OnlineShop } from '@nordcom/commerce-db';
import { InvalidShopifyCustomerAccountsApiConfiguration } from '@nordcom/commerce-errors';

import type { OAuthConfig, OAuthUserConfig } from 'next-auth/providers';

export const SHOPIFY_CUSTOMER_ACCOUNT_ACCESS_TOKEN_COOKIE = 'SHOPIFY_ACCOUNT_ACCESS_TOKEN';
const VERCEL_DEPLOYMENT = process.env.VERCEL_URL;

interface ShopifyCustomer {
    id: string;
    displayName: string;
    emailAddress: {
        emailAddress: string;
    };
}

const getCustomerGql = /* GraphQL */ `
    query getCustomerForSession {
        customer {
            id
            displayName
            emailAddress {
                emailAddress
            }
        }
    }
`;

const ShopifyProvider = (
    options: OAuthUserConfig<ShopifyCustomer>,
    customers: { id: string; clientId: string; clientSecret: string },
    shop: OnlineShop
): OAuthConfig<ShopifyCustomer> => {
    if (!(customers as any)) {
        throw new InvalidShopifyCustomerAccountsApiConfiguration();
    }
    const endpointBase = `https://shopify.com/${customers.id}/auth`;

    const { hostname } = new URL(`https://${shop.domain}`);
    const hostParts = hostname.split('.');
    const domain = `${hostParts.at(-2)}.${hostParts.at(-1)}`;

    const callbackUrl = `https://${domain}/api/auth/callback`;

    return {
        id: 'shopify',
        name: 'Shopify',
        type: 'oidc',
        clientId: customers.clientId,
        clientSecret: customers.clientSecret,
        issuer: 'https://customer.login.shopify.com',
        authorization: {
            url: `${endpointBase}/oauth/authorize`,
            params: {
                scope: 'openid email https://api.customers.com/auth/customer.graphql',
                client_id: customers.clientId,
                response_type: 'code',
                redirect_uri: callbackUrl
            }
        },
        token: {
            url: `${endpointBase}/oauth/token`,
            params: {
                grant_type: 'authorization_code',
                client_id: customers.clientId,
                redirect_uri: callbackUrl
            }
        }
        //options // FIXME.
    };
};

export default ShopifyProvider;
