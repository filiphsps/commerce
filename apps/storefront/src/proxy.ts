import { randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { admin } from '@/middleware/admin';
import { storefront } from '@/middleware/storefront';

export const config = {
    matcher: [
        '/((?!_next|_static|_vercel|instrumentation|assets|__nextjs_original-stack-frame).*)',

        // Handle assets we generate dynamically per-tenant.
        '/:path*/favicon:type*',
        '/:path*/apple-icon:type*',
        '/:path*/sitemap:type*.xml',
        '/:path*/robots.txt',
    ],
    missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
    ],
};

const VISITOR_COOKIE = 'nordcom-visitor-id';
const VISITOR_HEADER = 'x-nordcom-visitor-id';

function ensureVisitorId(req: NextRequest): { id: string; existed: boolean } {
    const existing = req.cookies.get(VISITOR_COOKIE)?.value;
    if (existing) return { id: existing, existed: true };
    return { id: randomUUID(), existed: false };
}

async function dispatch(req: NextRequest): Promise<NextResponse> {
    const url = req.nextUrl.clone();
    const pathname = url.pathname;
    const segments = pathname.split('/').filter((_) => _.length > 0);

    if (segments[0] === 'admin') {
        return admin(req);
    }

    if (segments[0] === '.well-known' && segments[1] === 'vercel') {
        return NextResponse.next();
    }

    return storefront(req);
}

export default async function proxy(req: NextRequest): Promise<NextResponse> {
    const { id: visitorId, existed } = ensureVisitorId(req);
    if (!existed) {
        // Mirror to request headers so the current request's flag adapter sees
        // the same value the next request will read from the cookie.
        req.headers.set(VISITOR_HEADER, visitorId);
    }

    const res = await dispatch(req);

    if (!existed) {
        res.cookies.set(VISITOR_COOKIE, visitorId, {
            httpOnly: false,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 365 * 2,
            path: '/',
        });
    }

    return res;
}
