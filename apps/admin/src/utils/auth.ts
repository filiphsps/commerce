import 'server-only';

import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@nordcom/commerce-database';
import { getServerSession } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';

import type { NextAuthOptions } from 'next-auth';

export type AuthProvider = 'github';

const VERCEL_DEPLOYMENT = !!process.env.VERCEL_URL;

export const authOptions: NextAuthOptions = {
    providers: [
        GitHubProvider({
            clientId: process.env.GITHUB_ID as string,
            clientSecret: process.env.GITHUB_TOKEN as string,
            profile(profile) {
                return {
                    id: profile.id.toString(),
                    name: profile.name || profile.login,
                    ghUsername: profile.login,
                    email: profile.email
                };
            }
        })
    ],
    pages: {
        signIn: `/admin/auth/login/`,
        signOut: `/admin/auth/logout/`,
        verifyRequest: `/admin/auth/login/`,
        error: '/admin/auth/login/' // Error code passed in query string as ?error=
    },
    adapter: PrismaAdapter(prisma as any),
    session: { strategy: 'jwt' },
    cookies: {
        sessionToken: {
            name: `${VERCEL_DEPLOYMENT ? '__Secure-' : ''}nordcom-commerce.admin.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                // When working on localhost, the cookie domain must be omitted entirely (https://stackoverflow.com/a/1188145)
                domain: VERCEL_DEPLOYMENT ? `.nordcom.io` : undefined,
                secure: VERCEL_DEPLOYMENT
            }
        }
    },
    callbacks: {
        jwt: async ({ token, user }) => {
            if (user) {
                token.user = user;
            }
            return token;
        },
        session: async ({ session, token }) => {
            session.user = {
                ...session.user,
                // @ts-expect-error
                id: token.sub,
                // @ts-expect-error
                username: token?.user?.username || token?.user?.ghUsername
            };
            return session;
        },
        async redirect({ url, baseUrl }) {
            if (url.startsWith('/')) return `${baseUrl}${url}`;
            return baseUrl;
        }
    },
    debug: false
};

export function getSession() {
    return getServerSession(authOptions) as Promise<{
        user: {
            id: string;
            name: string;
            username: string;
            email: string;
        };
    } | null>;
}
