/* c8 ignore start */
import authConfig from '@/utils/auth.config';
import { NextResponse } from 'next/server';
import NextAuth from 'next-auth';

export const config = {
    matcher: ['/((?!_next|_static|_vercel|instrumentation|assets|favicon.ico|[\\w-]+\\.\\w+).*)'],
    missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' }
    ]
};

const { auth } = NextAuth(authConfig);

export default auth(() => {
    return NextResponse.next();
});
/* c8 ignore stop */
