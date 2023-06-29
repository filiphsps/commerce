import { NextResponse } from 'next/server';
import { i18n } from './next-i18next.config.cjs';
import parser from 'accept-language-parser';

const PUBLIC_FILE = /\.(.*)$/;
// FIXME: MAke these dynamic

// Based on https://github.com/vercel/next.js/discussions/18419#discussioncomment-3838336
// then later also on https://stackoverflow.com/a/75845778/3142553
export let middleware = (req) => {
    if (
        req.nextUrl.pathname.startsWith('/_next') ||
        req.nextUrl.pathname.startsWith('/_next') ||
        req.nextUrl.pathname.includes('/monitoring') ||
        PUBLIC_FILE.test(req.nextUrl.pathname)
    ) {
        return null;
    }

    const acceptLanguageHeader = req.headers.get('accept-language');

    if (req.nextUrl.locale === 'x-default') {
        const newUrl = req.nextUrl.clone();
        const headers = req.headers.get('accept-language');
        const userLang = parser.pick(i18n.locales, acceptLanguageHeader);

        if (!headers) return NextResponse.rewrite(newUrl);
        const savedLocale = req.cookies.get('NEXT_LOCALE');
        const newLocale =
            savedLocale || userLang || i18n.locales.filter((i) => i !== 'x-default').at(0);
        newUrl.locale = newLocale;

        if (newUrl) return NextResponse.redirect(newUrl);
    }

    return undefined;
};

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|_next/data|favicon.ico|fonts|images|scripts|og-image.png|sitemap|robots|_next|assets|static|monitoring).*)'
    ]
};
