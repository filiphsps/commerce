import NextAuth from 'next-auth';

import authConfig from '@/utils/auth.config';

import type { NextAuthRequest } from 'next-auth/lib';

export const runtime = 'experimental-edge';
export const config = {
    matcher: ['/((?!_next|_static|_vercel|instrumentation|assets|favicon.ico|[\\w-]+\\.\\w+).*)'],
    missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' }
    ]
};

const { auth } = NextAuth(authConfig);

export default auth((_req: NextAuthRequest) => {
    return undefined;
});
