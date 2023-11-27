import 'server-only';

import prisma from '#/utils/prisma';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { getServerSession, type NextAuthOptions } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';

export type AuthProvider = 'github' | 'google';

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
                    gh_username: profile.login,
                    emails: [
                        {
                            email: profile.email
                        }
                    ]
                };
            }
        })
    ],
    pages: {
        signIn: `/login`,
        verifyRequest: `/login`,
        error: '/login' // Error code passed in query string as ?error=
    },
    adapter: PrismaAdapter(prisma),
    session: { strategy: 'jwt' },
    cookies: {
        sessionToken: {
            name: `${VERCEL_DEPLOYMENT ? '__Secure-' : ''}next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                // When working on localhost, the cookie domain must be omitted entirely (https://stackoverflow.com/a/1188145)
                domain: VERCEL_DEPLOYMENT ? `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}` : undefined,
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
                username: token?.user?.username || token?.user?.gh_username
            };
            return session;
        }
    }
};

export function getSession() {
    return getServerSession(authOptions) as Promise<{
        user: {
            id: string;
            name: string;
            username: string;
            emails: { email: string }[];
        };
    } | null>;
}
