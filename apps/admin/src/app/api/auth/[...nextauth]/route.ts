import { authOptions } from '@/utils/auth';
import NextAuth from 'next-auth';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export type AuthApiRouteParams = {
    nextauth: string[];
};
async function handler(req: NextRequest, context: { params: AuthApiRouteParams }) {
    let newUrl = req.nextUrl.clone();
    newUrl.hostname = 'shops.nordcom.io';

    if (!newUrl.pathname.startsWith('/admin')) {
        newUrl.pathname = `/admin${newUrl.pathname}`;
    }

    if (process.env.NODE_ENV !== 'production') {
        newUrl.hostname = `${newUrl.hostname}.localhost`;
    }

    return (await NextAuth(authOptions))(new NextRequest(newUrl, req), context);
}

export { handler as GET, handler as POST };
