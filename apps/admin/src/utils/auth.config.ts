import type { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';

import { LANDING_DOMAIN } from '@/utils/domains';

const NEXTAUTH_URL = process.env.NEXTAUTH_URL || null;

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
            name: `${NEXTAUTH_URL ? '__Secure-' : ''}next-auth.session-token`,
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
