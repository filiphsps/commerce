import { NextResponse } from 'next/server';
import NextAuth from 'next-auth';

import authConfig from '@/utils/auth.config';

const { auth } = NextAuth(authConfig);

export default auth(async (req) => {
    return NextResponse.next({
        request: req
    });
});

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
