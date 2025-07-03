import { admin } from '@/middleware/admin';
import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

export const runtime = 'experimental-edge';
export const config = {
    matcher: ['/((?!_next|_static|_vercel|instrumentation|assets|[\\w-]+\\.\\w+).*)'],
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

    if (segments[0] === 'admin') {
        return admin(req);
    }

    return NextResponse.next();
}
/* c8 ignore stop */
