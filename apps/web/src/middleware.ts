import { router } from '@/middleware/router';
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'experimental-edge';
export const config = {
    matcher: ['/((?!storefront|admin|unknown|_next|_static|slice-simulator|instrumentation).*)']
};

export default async function middleware(req: NextRequest) {
    // Deal with cloudflare image resizing api on unsupported domains.
    if (req.nextUrl.pathname.startsWith('/cdn-cgi/image')) {
        // TODO: Include width and quality in the redirect.
        const res = `https://${req.nextUrl.pathname
            .split('/')
            .slice(req.nextUrl.pathname.includes('://') ? 5 : 4)
            .join('/')}`;
        return NextResponse.redirect(res);
    }

    return router(req);
}
