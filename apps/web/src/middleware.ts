import { router } from '@/middleware/router';
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'experimental-edge';
export const config = {
    matcher: [
        '/((?!_next|_static|_vercel|instrumentation|highlight-events|assets|[\\w-]+\\.\\w+).*)',
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
    const path = req.nextUrl.pathname;
    // Prevent direct access.
    if (path.startsWith('/shops') || path.startsWith('/storefront')) {
        return new NextResponse(null, { status: 404 });
    }

    return router(req);
}
