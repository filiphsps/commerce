import { NextResponse } from 'next/server';
import NextAuth from 'next-auth';

import authConfig from '@/utils/auth.config';

export const { auth: middleware } = NextAuth(authConfig)

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
