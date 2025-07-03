import { admin } from '@/middleware/admin';
import { storefront } from '@/middleware/storefront';
import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

export const runtime = 'experimental-edge';
export const config = {
    matcher: [
        '/((?!_next|_static|_vercel|instrumentation|assets|__nextjs_original-stack-frame).*)',

        // Handle assets we generate dynamically per-tenant.
        '/:path*/favicon:type*',
        '/:path*/apple-icon:type*',
        '/:path*/sitemap:type*.xml',
        '/:path*/robots.txt'
    ],
    missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' }
    ]
};

export default async function middleware(req: NextRequest) {
    const url = req.nextUrl.clone();
    const pathname = url.pathname;
    const segments = pathname
        .split('/') // Split into an array of path segments.
        .filter((_) => _.length > 0); // Remove empty segments.

    // Handle admin routes.
    if (segments[0] === 'admin') {
        return admin(req);
    }

    // Handle vercel well-known endpoints like `/.well-known/vercel/flags`.
    if (segments[0] === '.well-known' && segments[1] === 'vercel') {
        return NextResponse.next();
    }

    // Fallback to the storefront.
    return storefront(req);
}
/* c8 ignore stop */
