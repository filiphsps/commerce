import { NextResponse, type NextRequest } from 'next/server';

import { router } from '@/middleware/router';

export const runtime = 'experimental-edge';
export const config = {
    // matcher: ['/:path*']
    matcher: ['/((?!_next|_static|slice-simulator|storefront).*)', 'favicon.png', 'dynamic-sitemap.xml']
};

export default async function middleware(req: NextRequest) {
    return router(req);
}
