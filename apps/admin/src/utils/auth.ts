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
    events: {
        async signIn(args) {
            console.debug('signIn', args);
        }
    },
    callbacks: {
        async session({ token, session }) {
            return {
                ...session,
                ...token
            };
        },
        async jwt({ token }) {
            return token;
        }
    },
    ...config
});
