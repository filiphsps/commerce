import { commonValidations } from '@/middleware/common-validations';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/* c8 ignore start */
export const admin = (req: NextRequest): NextResponse => {
    let newUrl = req.nextUrl.clone();

    // Check if we're dealing with a file or a route.
    if (newUrl.pathname.match(/\.[a-zA-Z]{2,6}$/gi)) {
        const target = `/admin${newUrl.pathname}${newUrl.search}`;
        return NextResponse.rewrite(new URL(target, req.url));
    }

    // Validate the url against our common issues.
    newUrl = commonValidations(newUrl);

    // Redirect if `newURL` is different from `req.nextUrl`.
    if (newUrl.href !== req.nextUrl.href) {
        return NextResponse.redirect(newUrl, { status: 302 });
    }

    const target = `/admin${newUrl.pathname}${newUrl.search}`;
    return NextResponse.rewrite(new URL(target, req.url));
};
/* c8 ignore stop */
