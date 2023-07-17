import { NextRequest, NextResponse } from 'next/server';

import AcceptLanguageParser from 'accept-language-parser';
import { i18n } from './next-i18next.config.cjs';

const PUBLIC_FILE = /\.(.*)$/;
// FIXME: Make these dynamic

// Based on https://github.com/vercel/next.js/discussions/18419#discussioncomment-3838336
// then later also on https://stackoverflow.com/a/75845778/3142553
export const middleware = (req: NextRequest) => {
    if (
        PUBLIC_FILE.test(req.nextUrl.pathname) ||
        req.nextUrl.pathname.includes('/monitoring/') ||
        req.nextUrl.pathname.includes('/api/') ||
        req.nextUrl.pathname.includes('/_next/')
    ) {
        return null;
    }

    // Fix invalid country codes
    if (req.nextUrl.locale === 'x-default') {
        const localeRegex = /\/[A-Za-z][A-Za-z]-[A-Za-z][A-Za-z]\//im;
        const localeFromUrl = req.url.match(localeRegex)?.at(0)?.replaceAll('/', '');

        if (localeFromUrl && req.nextUrl.locale !== localeFromUrl) {
            const language = localeFromUrl.split('-')[0];
            const country = localeFromUrl.split('-')[1].toUpperCase();
            const locale = `${language}-${country}`;

            const newUrl = req.nextUrl.clone();
            newUrl.locale = (i18n.locales.includes(locale) && locale) || 'x-default';
            newUrl.href = newUrl.href.replace(`/${localeFromUrl}`, '');
            return NextResponse.redirect(newUrl);
        }
    }

    // Handle locale detection
    const acceptLanguageHeader = req.headers.get('accept-language') || '';
    if (req.nextUrl.locale === 'x-default') {
        const newUrl = req.nextUrl.clone();
        const headers = req.headers.get('accept-language');
        const userLang = AcceptLanguageParser.pick(i18n.locales, acceptLanguageHeader);

        if (!headers) return NextResponse.rewrite(newUrl);
        const savedLocale = req.cookies.get('NEXT_LOCALE')?.value;
        const newLocale =
            savedLocale || userLang || i18n.locales.filter((i) => i !== 'x-default').at(0);

        if (newLocale) {
            newUrl.locale = newLocale;

            if (newUrl) return NextResponse.redirect(newUrl);
        }
    }

    return undefined;
};
