import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { admin } from '@/middleware/admin';
import { docs } from '@/middleware/docs';

export const config = {
    matcher: ['/((?!_next|_static|_vercel|instrumentation|assets|[\\w-]+\\.\\w+).*)'],
    missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
    ],
};

/**
 * Entry-point middleware that dispatches requests to the appropriate sub-handler.
 *
 * Routes `/admin/*` traffic to the admin rewrite handler and `/docs/*` (plus the docs site's own
 * `/commerce/*` base path) to the documentation proxy; all other requests pass through unmodified.
 *
 * @param req - Incoming Next.js middleware request.
 * @returns A rewrite response for admin or docs routes, or a pass-through response otherwise.
 */
export default async function proxy(req: NextRequest) {
    const url = req.nextUrl.clone();
    const pathname = url.pathname;
    const segments = pathname
        .split('/') // Split into an array of path segments.
        .filter((_) => _.length > 0); // Remove empty segments.

    if (segments[0] === 'admin') {
        return admin(req);
    }

    if (segments[0] === 'docs' || segments[0] === 'commerce') {
        return docs(req);
    }

    return NextResponse.next();
}
