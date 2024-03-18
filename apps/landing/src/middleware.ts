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

    if (newUrl.pathname.startsWith('/admin')) {
        let target = newUrl.clone();
        target.hostname = 'nordcom-commerce-admin.vercel.app';
        return NextResponse.rewrite(target);
    }

    return NextResponse.next();
}
