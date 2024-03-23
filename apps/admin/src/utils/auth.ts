import 'server-only';

import NextAuth from 'next-auth';

import { AuthAdapter } from './auth.adapter';
import config from './auth.config';

export type { Provider as AuthProvider } from 'next-auth/providers';

export const {
    handlers: { GET, POST },
    signIn,
    signOut,
    auth
} = NextAuth({
    adapter: AuthAdapter(),
    session: {
        strategy: 'jwt'
    },
    pages: {
        signIn: `/auth/login/`,
        signOut: `/auth/logout/`,
        error: '/auth/login/'
    },
    callbacks: {
        async session({ token, session, ...args }) {
            return {
                ...session,
                user: {
                    ...session.user,
                    id: token.sub
                },
                ...token
            };
        },
        async jwt({ token, ...args }) {
            return token;
        }
    },
    ...config
});
