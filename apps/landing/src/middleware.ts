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
    let newUrl = req.nextUrl.clone();

    // Don't rewrite if the new URL is the same as the original URL.
    if (newUrl.href !== req.nextUrl.href) {
        return NextResponse.rewrite(newUrl.href);
    }

    // Validations that doesn't apply to admin routes.
    if (!newUrl.pathname.startsWith('/admin')) {
        return NextResponse.next();
    }

    return NextResponse.rewrite(new URL(newUrl.pathname, 'https://admin.shops.nordcom.io/'));
}
