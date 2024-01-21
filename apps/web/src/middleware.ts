import { storefront } from '@/middleware/storefront';
import type { NextRequest } from 'next/server';

export const runtime = 'experimental-edge';
export const config = {
    matcher: [
        '/((?!_next|_static|_vercel|instrumentation|assets|[\\w-]+\\.\\w+).*)',
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
    return storefront(req);
}
