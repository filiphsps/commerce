import type { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';

import { LANDING_DOMAIN } from '@/utils/domains';

const NEXTAUTH_URL = process.env.NEXTAUTH_URL || null;

// Auth.js v5's default session cookie name is `__Secure-authjs.session-token`
// (note `authjs.` prefix, not the legacy `next-auth.` from NextAuth v4).
// Keep that default name — overriding it to `next-auth.session-token` made
// the CSRF/callback cookies (which we don't override and which use Auth.js
// defaults `authjs.*`) inconsistent with the session token, and the Payload
// auth-bridge could end up reading the wrong cookie name in prod.
//
// Only override the cookie OPTIONS here (domain, secure flag) so the cookie
// is shared across `.${LANDING_DOMAIN}` subdomains. The bridge reads the
// canonical Auth.js v5 name (see payload.config.ts).
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
            // Use Auth.js v5's canonical name. `__Secure-` prefix is added by
            // Auth.js automatically when it detects HTTPS (NEXTAUTH_URL set).
            name: `${NEXTAUTH_URL ? '__Secure-' : ''}authjs.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                domain: NEXTAUTH_URL ? `.${LANDING_DOMAIN}` : undefined,
                secure: !!NEXTAUTH_URL,
            },
        },
    },
    // Keep the env-name fallback aligned with payload.config.ts so a prod
    // deployment that sets only `NEXTAUTH_SECRET` (the Auth.js v5 default) or
    // only `AUTH_SECRET` (the older name) doesn't end up with one half of the
    // app encrypting cookies with one secret and the other half trying to
    // decrypt with another.
    secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
    debug: false,
} satisfies NextAuthConfig;
