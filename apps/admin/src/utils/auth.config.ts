import GitHub from 'next-auth/providers/github';

import type { NextAuthConfig } from 'next-auth';

const NEXTAUTH_URL = process.env.NEXTAUTH_URL || null;
const INTERNAL_HOSTNAME = 'shops.nordcom.io';

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
                    image: avatar_url
                };
            }
        })
    ],
    cookies: {
        sessionToken: {
            name: `${NEXTAUTH_URL ? '__Secure-' : ''}next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                domain: NEXTAUTH_URL ? `.${INTERNAL_HOSTNAME}` : undefined,
                secure: !!NEXTAUTH_URL
            }
        }
    },
    secret: process.env.AUTH_SECRET,
    debug: false
} satisfies NextAuthConfig;
