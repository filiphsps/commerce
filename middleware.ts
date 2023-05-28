import { Config } from './src/util/Config';
import { NextResponse } from 'next/server';
import acceptLanguage from 'accept-language';

var locales = Config.i18n.locales;
acceptLanguage.languages(locales.length > 0 ? locales : ['en-US']);

// Based on https://github.com/vercel/next.js/discussions/18419#discussioncomment-3838336
export let middleware = (request) => {
    if (request.nextUrl.pathname.startsWith('/_next')) {
        return undefined;
    } else if (request.nextUrl.pathname.startsWith('/api')) {
        return undefined;
    }

    if (
        !/\.(.*)$/.test(request.nextUrl.pathname) &&
        request.nextUrl.locale === '__default'
    ) {
        const newUrl = request.nextUrl.clone();
        const headers = request.headers.get('accept-language');
        const userLang = acceptLanguage.get(headers);

        if (!headers) return NextResponse.rewrite(newUrl);
        const savedLocale = request.cookies.get('NEXT_LOCALE');
        const newLocale = savedLocale || userLang || locales;
        newUrl.locale = newLocale;

        if (newUrl) return NextResponse.redirect(newUrl);
    }

    return undefined;
};

/*export const config = {
    matcher: [
        `/((?!api|favicon.ico|fonts|images|scripts|og-image.png|sitemap|robots|_next|__default|${(
            Config?.i18n?.locales || ['en-US']
        ).join('|')}).*)/`
    ]
};*/
