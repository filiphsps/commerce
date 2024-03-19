import 'server-only';

import NextAuth from 'next-auth';
import { AuthAdapter } from './auth.adapter';
import config from './auth.config';

export type { Provider as AuthProvider } from 'next-auth/providers';

export const {
    handlers: { GET, POST },
    auth
} = NextAuth({
    adapter: AuthAdapter(),
    session: {
        strategy: 'jwt'
    },
    callbacks: {
        async jwt({ token, user }) {
            return { ...token, ...(user ? { user } : {}) };
        },

        async session({ session, token }) {
            return { ...session, ...token };
        },

        async redirect({ baseUrl, url }) {
            if (url.startsWith('/')) return `${baseUrl}${url}`;

            return new URL(url).origin === baseUrl ? url : baseUrl;
        }
    },
    ...config
});
