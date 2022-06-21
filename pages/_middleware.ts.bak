import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { RedirectsApi } from '../src/api/redirects';

export async function middleware(req: NextRequest) {
    // FIXME: Do this in next.config.js

    if (
        !req.nextUrl.pathname.startsWith('/products/') &&
        !req.nextUrl.pathname.startsWith('/collections/')
    )
        return NextResponse.next();

    const redirects = await RedirectsApi();

    for (let i = 0; i < redirects.length; i++) {
        const redirect = redirects[i];

        if (redirect.path !== req.nextUrl.pathname) continue;

        return NextResponse.redirect(new URL(redirect.target, req.url));
    }

    return NextResponse.next();
}
