import { NextResponse, type NextRequest } from 'next/server';

export const config = {
    matcher: ['/((?!_next|_static|_vercel|instrumentation|assets|favicon.ico|[\\w-]+\\.\\w+).*)'],
    missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
    ],
};

/**
 * Top-level admin proxy.
 *
 * Today this only enforces a back-compat redirect from the legacy `/cms/*`
 * paths (the now-deleted Payload mounted admin shell) to the dashboard root.
 * Bookmarks and muscle-memory still resolve to a usable page rather than a
 * 404. Co-located CMS routes live under `/[domain]/content/...` and admin
 * routes (tenants/users/media) live at the path root — both are reachable
 * after the redirect lands the user on `/`.
 */
export default function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (pathname === '/cms' || pathname.startsWith('/cms/')) {
        // No domain context survives the legacy URL; bounce to the dashboard root
        // and let the user re-navigate. Trailing slash matches `trailingSlash: true`.
        const dest = new URL('/', request.url);
        return NextResponse.redirect(dest, 301);
    }

    return NextResponse.next();
}
