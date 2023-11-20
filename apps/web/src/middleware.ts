import { NextResponse, type NextRequest } from 'next/server';

import { router } from '@/middleware/router';

export const runtime = 'experimental-edge';
export const config = {
    matcher: ['/:path*']
};

export default async function middleware(req: NextRequest) {
    if (
        req.nextUrl.pathname.startsWith('/_next') ||
        req.nextUrl.pathname.startsWith('/_static') ||
        req.nextUrl.pathname.startsWith('/slice-simulator') // TODO: This should probably live in the storefront.
    ) {
        return NextResponse.next();
    }

    return await router(req);
}
