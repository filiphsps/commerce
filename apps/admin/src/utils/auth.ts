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
    ...config
});
