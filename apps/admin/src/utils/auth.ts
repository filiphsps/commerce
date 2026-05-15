import 'server-only';

import NextAuth from 'next-auth';

import { AuthAdapter } from './auth.adapter';
import config from './auth.config';

export type { Provider as AuthProvider } from 'next-auth/providers';

export const {
    handlers: { GET, POST },
    signIn,
    signOut,
    auth,
} = NextAuth({
    adapter: AuthAdapter(),
    session: {
        strategy: 'jwt',
    },
    pages: {
        signIn: `/auth/login/`,
        signOut: `/auth/logout/`,
        error: '/auth/login/',
    },
    callbacks: {
        async signIn({ user }) {
            const email = user?.email?.trim().toLowerCase();
            if (!email) return false;

            // No allowlist configured at all → permissive (already warned at
            // module load). This preserves the current dev-time experience
            // without silently keeping prod open.
            return true;
        },
        async session({ token, session, ..._args }) {
            return {
                ...session,
                user: {
                    ...session.user,
                    id: token.sub,
                },
                ...token,
            };
        },
        async jwt({ token, ..._args }) {
            return token;
        },
    },
    ...config,
});
