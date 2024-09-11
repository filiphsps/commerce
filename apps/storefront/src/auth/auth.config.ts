import type { NextAuthConfig } from 'next-auth';

const shopifyBasePath = `https://shopify.com/<SHOP_ID>/auth/oauth`;
const redirectUri = `<NGROK_URL>/api/auth/callback/shopify`;

export default {
    providers: [
        {
            id: 'shopify',
            name: 'Shopify',
            type: 'oidc',
            clientId: process.env.AUTH_CLIENT_ID,
            clientSecret: process.env.AUTH_CLIENT_SECRET,
            issuer: 'https://customer.login.shopify.com',
            authorization: {
                url: `${shopifyBasePath}/authorize`,
                params: {
                    scope: 'openid email https://api.customers.com/auth/customer.graphql',
                    client_id: process.env.AUTH_CLIENT_ID,
                    response_type: 'code',
                    redirect_uri: redirectUri
                }
            }
        }
    ],
    secret: process.env.AUTH_SECRET,
    debug: false
} satisfies NextAuthConfig;
