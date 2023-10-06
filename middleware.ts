import { NextRequest, NextResponse } from 'next/server';

import AcceptLanguageParser from 'accept-language-parser';

const locales = [
    ...(process.env.STORE_LOCALES ? [...process.env.STORE_LOCALES.split(',')] : ['en-US'])
];

const PUBLIC_FILE = /\.(.*)$/;
// FIXME: Make these dynamic

// Based on https://github.com/vercel/next.js/discussions/18419#discussioncomment-3838336
// then later also on https://stackoverflow.com/a/75845778/3142553
export default function middleware(req: NextRequest) {
    if (
        req.nextUrl.pathname.startsWith('/_next/') ||
        req.nextUrl.pathname.startsWith('/monitoring/') ||
        req.nextUrl.pathname.startsWith('/api/') ||
        PUBLIC_FILE.test(req.nextUrl.pathname)
    ) {
        return null;
    }

    if (req.nextUrl.locale === 'x-default') {
        const newUrl = req.nextUrl.clone();
        const acceptLanguageHeader = req.headers.get('accept-language') || '';
        const userLang = AcceptLanguageParser.pick(locales, acceptLanguageHeader);

        const savedLocale = req.cookies.get('NEXT_LOCALE')?.value;
        const newLocale = savedLocale || userLang || locales.at(0);

        if (newLocale) {
            newUrl.locale = newLocale;
            newUrl.host = req.headers.get('host')!;

            if (newUrl) return NextResponse.redirect(newUrl);
        }
    }

    return undefined;
}
export const config = {
    matcher: ['/:path*'],
    //matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)'
};
