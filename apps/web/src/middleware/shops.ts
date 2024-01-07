import { commonValidations } from '@/middleware/common-validations';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const shops = async (req: NextRequest): Promise<NextResponse> => {
    let newUrl = req.nextUrl.clone();

    // Check if we're dealing with a file or a route.
    if (newUrl.pathname.match(/\.[a-zA-Z]{2,6}$/gi) || newUrl.pathname.includes('.')) {
        const target = `/shops${newUrl.pathname}${newUrl.search}`;
        console.log(target);
        return NextResponse.rewrite(new URL(target, req.url));
    }

    // Check if we're trying to access the error pages directly.
    if (newUrl.pathname.startsWith('/errors')) {
        // TODO: Return the 404 page.
        console.warn('User accessed the `/errors` path directly');
    }

    // Validate the url against our common issues.
    newUrl = commonValidations(newUrl);

    // Validations that doesn't apply to api routes.
    if (!newUrl.pathname.includes('/api')) {
        // Make sure the url ends with a trailing slash.
        if (!(newUrl.href.split('?')[0]!.endsWith('/') && newUrl.pathname.endsWith('/'))) {
            newUrl.href = newUrl.href = `${newUrl.href.split('?')[0]}/${newUrl.search}`;
        }
    }

    // Redirect if `newURL` is different from `req.nextUrl`.
    if (newUrl.href !== req.nextUrl.href) {
        return NextResponse.redirect(newUrl, { status: 301 });
    }

    const target = `/shops${newUrl.pathname}${newUrl.search}`;
    return NextResponse.rewrite(new URL(target, req.url));
};
