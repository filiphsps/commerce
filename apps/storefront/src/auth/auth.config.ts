import type { OnlineShop } from '@nordcom/commerce-db';
import type { NextAuthConfig } from 'next-auth';
import ShopifyProvider from '@/auth/shopify-provider';

const VERCEL_DEPLOYMENT = process.env.VERCEL_URL;

const config = ({
    shop,
    shopifyAuth,
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
        skipCSRFCheck: true as unknown as NextAuthConfig['skipCSRFCheck'], // TODO
        cookies: {
            sessionToken: {
                name: `${VERCEL_DEPLOYMENT ? '__Secure-' : ''}NordcomCommerceSession`,
                options: {
                    httpOnly: true,
                    sameSite: 'lax',
                    path: '/',
                    // When working on localhost, the cookie domain must be omitted entirely (https://stackoverflow.com/a/1188145)
                    domain: VERCEL_DEPLOYMENT ? `.${shop.domain.split('.').slice(-2).join('.')}` : undefined,
                    secure: !!VERCEL_DEPLOYMENT,
                },
            },
        },
        // Mirror the env-name fallback the admin app uses. A deployment that
        // sets only `NEXTAUTH_SECRET` (Auth.js v5 default) would otherwise
        // leave the storefront's NextAuth with `secret: undefined`, which
        // silently breaks session encryption — and the failure mode looks
        // like "customers can't stay logged in" rather than the underlying
        // misconfiguration.
        secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
        debug: false,
    } satisfies NextAuthConfig;
};

export default config;
