import { NextRequest, NextResponse } from 'next/server';

import AcceptLanguageParser from 'accept-language-parser';
import { i18n } from './next-i18next.config.cjs';

const PUBLIC_FILE = /\.(.*)$/;
// FIXME: Make these dynamic

// Based on https://github.com/vercel/next.js/discussions/18419#discussioncomment-3838336
// then later also on https://stackoverflow.com/a/75845778/3142553
export default function middleware(req: NextRequest) {
    if (
        req.nextUrl.pathname.startsWith('/_next/') ||
        req.nextUrl.pathname.includes('/api/') ||
        req.nextUrl.pathname.startsWith('/monitoring/') ||
        PUBLIC_FILE.test(req.nextUrl.pathname)
    ) {
        return null;
    }

    if (req.nextUrl.locale === 'x-default') {
        const newUrl = req.nextUrl.clone();
        const acceptLanguageHeader = req.headers.get('accept-language') || '';
        const userLang = AcceptLanguageParser.pick(i18n.locales.slice(1), acceptLanguageHeader);

        const savedLocale = req.cookies.get('NEXT_LOCALE')?.value;
        const newLocale = savedLocale || userLang || i18n.locales.slice(1).at(0);

        if (newLocale) {
            newUrl.locale = newLocale;

            if (newUrl) return NextResponse.redirect(newUrl);
        }
    }
    return undefined;
}
