import { commonValidations } from '@/middleware/common-validations';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const admin = async (req: NextRequest): Promise<NextResponse> => {
    let newUrl = req.nextUrl.clone();

    // Prevent direct access.
    if (newUrl.pathname.startsWith('/admin')) {
        return new NextResponse(null, { status: 404 });
    }

    // Check if we're dealing with a file or a route.
    if (newUrl.pathname.match(/\.[a-zA-Z]{2,6}$/gi)) {
        const target = `/admin${newUrl.pathname}${newUrl.search}`;
        return NextResponse.rewrite(new URL(target, req.url));
    }

    // Check if we're trying to access the error pages directly.
    if (newUrl.pathname.startsWith('/errors')) {
        // TODO: Return the 404 page.
        console.warn('User accessed the `/errors` path directly');
    }

    // Validate the url against our common issues.
    newUrl = commonValidations(newUrl);

    // Add trailing slash to index.
    if (newUrl.pathname === '') {
        newUrl.pathname = '/';
    }

    // TODO: Redirect to path if we're no already there.

    // Redirect if `newURL` is different from `req.nextUrl`.
    if (newUrl.href !== req.nextUrl.href) {
        return NextResponse.redirect(newUrl, { status: 302 });
    }

    const target = `/admin${newUrl.pathname}${newUrl.search}`;
    return NextResponse.rewrite(new URL(target, req.url));
};
