import type { OnlineShop } from '@nordcom/commerce-db';

import ShopifyProvider from '@/auth/shopify-provider';

import type { NextAuthConfig } from 'next-auth';

const VERCEL_DEPLOYMENT = process.env.VERCEL_URL;

const config = ({
    shop,
    shopifyAuth
}: {
    shop: OnlineShop;
    shopifyAuth: {
        shopId: string;
        clientId: string;
        clientSecret: string;
    };
}) => {
    return {
        providers: [ShopifyProvider(shopifyAuth, shop)],
        skipCSRFCheck: true as any, // TODO
        cookies: {
            sessionToken: {
                name: `${VERCEL_DEPLOYMENT ? '__Secure-' : ''}NordcomCommerceSession`,
                options: {
                    httpOnly: true,
                    sameSite: 'lax',
                    path: '/',
                    // When working on localhost, the cookie domain must be omitted entirely (https://stackoverflow.com/a/1188145)
                    domain: !!VERCEL_DEPLOYMENT ? `.${shop.domain.split('.').slice(-2).join('.')}` : undefined,
                    secure: !!VERCEL_DEPLOYMENT
                }
            }
        },
        secret: process.env.AUTH_SECRET,
        debug: false
    } satisfies NextAuthConfig;
};

export default config;
