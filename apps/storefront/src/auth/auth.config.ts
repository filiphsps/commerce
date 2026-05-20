import type { OnlineShop } from '@nordcom/commerce-db';
import type { NextAuthConfig } from 'next-auth';
import ShopifyProvider from '@/auth/shopify-provider';

const IS_PROD = process.env.NODE_ENV === 'production';

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
                name: `${IS_PROD ? '__Secure-' : ''}NordcomCommerceSession`,
                options: {
                    httpOnly: true,
                    sameSite: 'lax',
                    path: '/',
                    // When working on localhost, the cookie domain must be omitted entirely (https://stackoverflow.com/a/1188145)
                    domain: IS_PROD ? `.${shop.domain.split('.').slice(-2).join('.')}` : undefined,
                    secure: !!IS_PROD,
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
