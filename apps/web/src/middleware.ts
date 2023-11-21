import { NextResponse, type NextRequest } from 'next/server';

import { router } from '@/middleware/router';

export const runtime = 'experimental-edge';
export const config = {
    // matcher: ['/:path*']
    matcher: ['/((?!storefront|_next|_static).*)', '/favicon.png', '/dynamic-sitemap.xml']
};

export default async function middleware(req: NextRequest) {
    return router(req);
}
