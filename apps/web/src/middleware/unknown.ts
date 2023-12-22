import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const unknown = async (req: NextRequest): Promise<NextResponse> => {
    let newUrl = req.nextUrl.clone();

    // Check if we're dealing with a file or a route.
    // NOTE: We should use the admin dashboard assets here,
    //       even though we're in the `unknown` middleware.
    if (newUrl.pathname.match(/\.[a-zA-Z]{2,6}$/gi)) {
        const target = `/admin${newUrl.pathname}${newUrl.search}`;
        return NextResponse.rewrite(new URL(target, req.url));
    }

    // Redirect to the root if we're not already there.
    if (newUrl.pathname !== '/') {
        newUrl.pathname = '/';

        return NextResponse.redirect(newUrl, { status: 307 });
    }

    const target = `/admin/errors/unknown-storefront/${newUrl.search}`;
    return NextResponse.rewrite(new URL(target, req.url), { status: 404 });
};
