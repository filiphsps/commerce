import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const runtime = 'experimental-edge';
export const config = {
    matcher: [
        // Admin routes
        '/admin/:path*'
    ],
    missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' }
    ]
};

export default async function middleware(req: NextRequest) {
    if (!req.nextUrl.pathname.startsWith('/admin')) {
        return NextResponse.next();
    }

    return NextResponse.rewrite(new URL(req.nextUrl.pathname, 'https://admin.shops.nordcom.io/'));
}
