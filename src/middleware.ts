import { NextRequest, NextResponse } from 'next/server';

import AcceptLanguageParser from 'accept-language-parser';

const locales = [...(process.env.STORE_LOCALES ? [...process.env.STORE_LOCALES.split(',')] : ['en-US'])];

const PUBLIC_FILE = /\.(.*)$/;

//export const runtime = 'experimental-edge';
export const config = {
    matcher: ['/:path*']
};

// Based on https://github.com/vercel/next.js/discussions/18419#discussioncomment-3838336
// then later also on https://stackoverflow.com/a/75845778/3142553
export default function middleware(req: NextRequest) {
    if (
        req.nextUrl.pathname.startsWith('/_next') ||
        req.nextUrl.pathname.startsWith('/_static') ||
        req.nextUrl.pathname.startsWith('/_vercel') ||
        req.nextUrl.pathname.startsWith('/instrumentation') ||
        req.nextUrl.pathname.startsWith('/api') ||
        req.nextUrl.pathname.startsWith('/assets') ||
        req.nextUrl.pathname.startsWith('/locales') ||
        req.nextUrl.pathname.startsWith('/monitoring') ||
        req.nextUrl.pathname.startsWith('/admin') ||
        PUBLIC_FILE.test(req.nextUrl.pathname)
    ) {
        return null;
    }

    const newUrl = req.nextUrl.clone();
    newUrl.host = req.headers.get('host') || newUrl.host;

    // Validate that we don't now have more than one locale in the path.
    // this can occur for numerous reasons. It's properly fixed in the
    // staging branch but we're not quite ready to release `v2.0` yet.
    const localeRegex = /\/([a-zA-Z]{2}-[a-zA-Z]{2})\//g;
    while (true) {
        const trailingLocales = newUrl.pathname.match(localeRegex);

        if (!trailingLocales || trailingLocales.length <= 0) break;

        newUrl.pathname = newUrl.pathname.replaceAll(localeRegex, '/');
    }

    if (req.nextUrl.locale === 'x-default') {
        const acceptLanguageHeader = req.headers.get('accept-language') || '';
        const userLang = AcceptLanguageParser.pick(locales, acceptLanguageHeader);

        const savedLocale = req.cookies.get('NEXT_LOCALE')?.value || req.cookies.get('LOCALE')?.value;
        const newLocale = savedLocale || userLang || locales.at(0);

        if (newLocale) {
            newUrl.locale = newLocale;
        }
    }

    // Remove `x-default` if it's still there.
    newUrl.pathname = newUrl.pathname.replaceAll('x-default/', '');

    // Make sure we don't have any double slashes.
    newUrl.pathname = newUrl.pathname.replaceAll(/\/\//g, '/');

    // Make sure we end with a slash.
    if (!newUrl.pathname.endsWith('/') && !newUrl.pathname.match(/((?!\.well-known(?:\/.*)?)(?:[^/]+\/)*[^/]+\.\w+)/)) {
        newUrl.pathname += '/';
    } else if (newUrl.pathname.includes('/homepage')) {
        newUrl.pathname = '/';
    }

    // Redirect if `newURL` is different from `req.nextUrl`.
    if (newUrl.href !== req.nextUrl.href) {
        return NextResponse.redirect(newUrl);
    }

    return NextResponse.next();
}
