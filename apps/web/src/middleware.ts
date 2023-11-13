import { NextResponse, type NextRequest } from 'next/server';

import { router } from '@/middleware/router';

export const config = {
    matcher: ['/:path*']
};

export default function middleware(req: NextRequest) {
    if (
        req.nextUrl.pathname.startsWith('/_next') ||
        req.nextUrl.pathname.startsWith('/_static') ||
        req.nextUrl.pathname.startsWith('/api') ||
        req.nextUrl.pathname.startsWith('/slice-simulator') // TODO: This should probably live in the storefront.
    ) {
        return NextResponse.next();
    }

    // TODO: Redirect files like favicon etc too.
    return router(req);
}
