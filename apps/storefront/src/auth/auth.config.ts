import type { OnlineShop } from '@nordcom/commerce-db';

import { NextAuthConfig } from 'next-auth';
import ShopifyProvider from './shopify-provider';

const VERCEL_DEPLOYMENT = process.env.VERCEL_URL;

export default ({
    domain,
    shop,
    shopifyAuth
}: {
    domain: string;
    shop: OnlineShop;
    shopifyAuth: {
        shopId: string;
        clientId: string;
        clientSecret: string;
    };
}) =>
    ({
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
                    domain: !!VERCEL_DEPLOYMENT ? `.${domain.split('.').slice(-2).join('.')}` : undefined,
                    secure: !!VERCEL_DEPLOYMENT
                }
            }
        },
        secret: process.env.AUTH_SECRET,
        debug: false
    }) satisfies NextAuthConfig;
