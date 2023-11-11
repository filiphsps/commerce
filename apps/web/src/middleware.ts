import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import AcceptLanguageParser from 'accept-language-parser';

const locales = [...(process.env.STORE_LOCALES ? [...process.env.STORE_LOCALES.split(',')] : ['en-US'])];

export const config = {
    matcher: [
        /*
         * Match all paths except for:
         * 1. /api routes
         * 2. /_next (Next.js internals)
         * 3. /_static (inside /public)
         * 4. all root files inside /public (e.g. /favicon.ico)
         */
        '/((?!api/|_next/|_static/|_vercel|monitoring|[\\w-]+\\.\\w+).*)'
    ]
};

export default function middleware(req: NextRequest) {
    // Get hostname of request (e.g. demo.vercel.pub, demo.localhost:3000).
    const host = req.headers.get('host')!.replace('.localhost:3000', '') || req.nextUrl.host;

    // If we're connecting via the nordcom domain show the admin dashboard
    // instead.
    if (host.includes('shops.nordcom.io')) {
        // TODO: Allow for dashboard middleware (NextResponse supports this).
        return NextResponse.rewrite(new URL(`/admin${req.nextUrl.pathname}`, req.url));
    }

    // TODO: Multi-tenant, rewrite new URL(`/${hostname}${req.nextUrl.pathname}`, req.url)

    // Validate the store url.
    const newUrl = req.nextUrl.clone();
    newUrl.host = host;

    // Set the locale based on the user's accept-language header when no locale
    // is provided (e.g. we get a bare url/path like `/`).
    if (!newUrl.pathname.match(/\/([a-zA-Z]{2}-[a-zA-Z]{2})/gi)) {
        const acceptLanguageHeader = req.headers.get('accept-language') || '';
        // FIXME: This should be dynamic, not based on a build-time configuration.
        //        Maybe we can use edge config for this?..
        const userLang = AcceptLanguageParser.pick(locales, acceptLanguageHeader);

        const savedLocale = req.cookies.get('LOCALE')?.value || req.cookies.get('NEXT_LOCALE')?.value;
        const locale = savedLocale || userLang || locales.at(0);

        if (!locale) {
            throw new Error(`No locale could be found for "${req.nextUrl.href}" and no default locale is set.`);
        }

        // In a perfect world we'd just set `newUrl.locale` here but
        // since we want to support fully dynamic locales we need to
        // set the locale in the path instead.
        newUrl.pathname = `/${locale}${newUrl.pathname}`;
    }

    // Validate that we don't now have more than one locale in the path,
    // for example `/en-US/de-DE/en-gb/de-de/about/` which should instead
    // be `/en-US/about/`. This can occur for numerous reasons; for example
    // invalid back-links, a user manually messing up or another thousands
    // of possible reasons.
    const localeRegex = /([a-zA-Z]{2}-[a-zA-Z]{2})\//gi;
    const trailingLocales = newUrl.pathname.match(localeRegex);
    if (trailingLocales && trailingLocales.length > 1) {
        for (const locale of trailingLocales.slice(1)) {
            newUrl.pathname = newUrl.pathname.replace(`${locale}`, '');
        }
        if (newUrl.pathname !== req.nextUrl.pathname) {
            console.warn(`Fixed locale duplication "${req.nextUrl.href}" -> "${newUrl.href}"`);
        }
    }

    // Prevent access to `admin` on storefronts.
    newUrl.pathname = newUrl.pathname.replaceAll('admin/', '');

    // Remove `x-default` if it's still there.
    newUrl.pathname = newUrl.pathname.replaceAll('x-default/', '');

    // Make sure we don't have any double slashes.
    newUrl.pathname = newUrl.pathname.replaceAll(/\/\//g, '/');

    // Make sure we end with a slash.
    if (!newUrl.pathname.endsWith('/') && !newUrl.pathname.match(/((?!\.well-known(?:\/.*)?)(?:[^/]+\/)*[^/]+\.\w+)/)) {
        newUrl.pathname += '/';
    }

    // Redirect if `newURL` is different from `req.nextUrl`.
    if (newUrl.href !== req.nextUrl.href) {
        return NextResponse.redirect(newUrl);
    }

    return NextResponse.next();
}
