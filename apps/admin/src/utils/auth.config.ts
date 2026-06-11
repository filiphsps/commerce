import type { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';

import { LANDING_DOMAIN } from '@/utils/domains';

const IS_PROD = process.env.NODE_ENV === 'production';

// Auth.js v5's default session cookie name is `__Secure-authjs.session-token`
// (note `authjs.` prefix, not the legacy `next-auth.` from NextAuth v4).
// Keep that default name — overriding it to `next-auth.session-token` made
// the CSRF/callback cookies (which we don't override and which use Auth.js
// defaults `authjs.*`) inconsistent with the session token, and the
// co-located admin routes (which read `await auth()` via
// `getAuthedCmsCtx`) would silently fall back to "no session" in prod.
//
// Only override the cookie OPTIONS here (domain, secure flag) so the cookie
// is shared across `.${LANDING_DOMAIN}` subdomains.
export default {
    providers: [
        GitHub({
            clientId: process.env.GITHUB_ID as string,
            clientSecret: process.env.GITHUB_TOKEN as string,

            profile({ id, name, email, login, avatar_url }) {
                return {
                    id: id.toString(),
                    name: name,
                    email: email || login,
                    image: avatar_url,
                };
            },
        }),
    ],
    cookies: {
        sessionToken: {
            // Use Auth.js v5's canonical name. `__Secure-` prefix is applied
            // in production (NODE_ENV === 'production') to scope cookies to HTTPS.
            name: `${IS_PROD ? '__Secure-' : ''}authjs.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                domain: IS_PROD ? `.${LANDING_DOMAIN}` : undefined,
                secure: IS_PROD,
            },
        },
    },
    // Accept either secret env name so a prod
    // deployment that sets only `NEXTAUTH_SECRET` (the Auth.js v5 default) or
    // only `AUTH_SECRET` (the older name) doesn't end up with one half of the
    // app encrypting cookies with one secret and the other half trying to
    // decrypt with another.
    secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
    debug: false,
} satisfies NextAuthConfig;
