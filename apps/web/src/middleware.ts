import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import AcceptLanguageParser from 'accept-language-parser';

const locales = [...(process.env.STORE_LOCALES ? [...process.env.STORE_LOCALES.split(',')] : ['en-US'])];

const PUBLIC_FILE = /\.(.*)$/;
export default function middleware(req: NextRequest) {
    // TODO: Make this configurable.
    if (
        req.nextUrl.pathname.startsWith('/admin') ||
        req.nextUrl.pathname.startsWith('/_next') ||
        req.nextUrl.pathname.startsWith('/api') ||
        req.nextUrl.pathname.startsWith('/assets') ||
        req.nextUrl.pathname.startsWith('/locales') ||
        req.nextUrl.pathname.startsWith('/monitoring') ||
        PUBLIC_FILE.test(req.nextUrl.pathname)
    ) {
        return null;
    }

    const newUrl = req.nextUrl.clone();
    newUrl.host = req.headers.get('host') || newUrl.host;

    // Set the locale based on the user's accept-language header
    // if no locale is provided (e.g. a bare url like `/`).
    if (!newUrl.pathname.match(/\/([a-zA-Z]{2}-[a-zA-Z]{2})/gi)) {
        const acceptLanguageHeader = req.headers.get('accept-language') || '';
        const userLang = AcceptLanguageParser.pick(locales, acceptLanguageHeader);

        const savedLocale = req.cookies.get('NEXT_LOCALE')?.value || req.cookies.get('LOCALE')?.value;
        const locale = savedLocale || userLang || locales.at(0);

        if (!locale)
            throw new Error(`No locale could be found for "${req.nextUrl.href}" and no default locale is set.`);

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
export const config = {
    matcher: ['/:path*']
    //matcher: '/((?!api|_next/static|_next/image|favicon).*)'
};
