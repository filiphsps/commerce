import { commonValidations } from '@/middleware/common-validations';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getToken } from "next-auth/jwt";

/* c8 ignore start */
export const admin = async (req: NextRequest): Promise<NextResponse> => {
    let newUrl = req.nextUrl.clone();

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

    // Check if were trying to access the dashboard section.
    if (newUrl.pathname.startsWith('/store')) {
        const session = await getToken({ req });

        // User is not logged in, so let's redirect them to the login page.
        if (!session) {
            return NextResponse.redirect(new URL("/login/", req.url));
        }
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
