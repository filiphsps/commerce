import GitHub from 'next-auth/providers/github';

import type { NextAuthConfig } from 'next-auth';

const IN_PRODUCTION = !!process.env.VERCEL_URL;

export default {
    providers: [
        GitHub({
            clientId: process.env.GITHUB_ID as string,
            clientSecret: process.env.GITHUB_TOKEN as string
        })
    ],
    pages: {
        signIn: `/auth/login/`,
        signOut: `/auth/logout/`,
        error: '/auth/login/'
    },
    cookies: {
        sessionToken: {
            name: `${IN_PRODUCTION ? '__Secure-' : ''}nordcom-commerce.admin.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                // When working on localhost, the cookie domain must be omitted entirely (https://stackoverflow.com/a/1188145)
                domain: IN_PRODUCTION ? `.nordcom.io` : undefined,
                secure: IN_PRODUCTION
            }
        }
    }
} satisfies NextAuthConfig;
