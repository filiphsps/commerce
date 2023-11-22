import { router } from '@/middleware/router';
import type { NextRequest } from 'next/server';

export const runtime = 'experimental-edge';
export const config = {
    // matcher: ['/:path*']
    matcher: ['/((?!storefront|admin|unknown|_next|_static).*)', '/favicon.png', '/dynamic-sitemap.xml', '/sitemap.xml']
};

export default async function middleware(req: NextRequest) {
    return router(req);
}
