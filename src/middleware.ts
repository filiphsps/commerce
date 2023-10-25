import { NextResponse, type NextRequest } from 'next/server';

import { Locale, NextLocaleToLocale } from '@/utils/locale';

function getHostname(request: NextRequest) {
    const { protocol, host } = request.nextUrl;
    return `${protocol}//${host}`;
}

function getLocale(request: NextRequest) {
    function getAcceptedLocale(): Locale | undefined {
        const headerValue = request.headers.get('accept-language');
        if (!headerValue) return undefined;

        const options = headerValue.split(',');
        for (const option of options) {
            if (option.split('-').length !== 2) continue;

            const locale = NextLocaleToLocale(option);
            return locale;
        }

        return undefined;
    }

    function getPreferredLocale(): Locale | undefined {
        const headerValue = request.headers.get('X-Language-Preference');
        const cookieValue = request.cookies.get('NEXT_LOCALE');

        if (!headerValue && !cookieValue) return undefined;
        else if ((headerValue ?? cookieValue?.value)?.split('-').length !== 2) return undefined;

        return NextLocaleToLocale(headerValue ?? cookieValue?.value);
    }

    function getCurrentLocale(): Locale | undefined {
        const host = getHostname(request);
        const relativeURL = request.nextUrl.toString().replace(host, '');

        if (relativeURL.split('/')[1].split('-').length !== 2) return undefined;

        const locale = NextLocaleToLocale(relativeURL.split('/')[1]);
        if (!locale) return undefined;
        return locale;
    }

    const current = getCurrentLocale();
    const accepted = getAcceptedLocale();
    const preferred = getPreferredLocale();

    if (current) {
        return { code: current.locale, origin: 'url', redirect: false };
    }

    if (preferred) {
        return { code: preferred.locale, origin: 'preference', redirect: !current };
    }

    if (accepted) {
        return { code: accepted.locale, origin: 'header', redirect: !current };
    }

    return { code: 'en-US', origin: 'fallback', redirect: !current };
}

function isExcluded(request: NextRequest): boolean {
    const excludes = [
        '/i18n',
        '/images',
        '/browserconfig.xml',
        '/site.webmanifest',
        '/sitemap',
        '/robots.txt',
        '/api',
        '/_next',
        '/_next/static',
        '/_next/image',
        '/assets',
        '/favicon.ico',
        '/sw.js',
        '/service-worker.js'
    ];

    const host = getHostname(request);
    const relativeURL = request.nextUrl.toString().replace(host, '');
    return excludes.some((path) => relativeURL.startsWith(path));
}

function setPreference(response: NextResponse, locale: string) {
    response.headers.set('X-Language-Preference', locale);
    response.cookies.set('NEXT_LOCALE', locale);
    return response;
}

const PUBLIC_FILE = /\.(.*)$/;

export default async function middleware(request: NextRequest) {
    if (
        request.nextUrl.pathname.startsWith('/_next/') ||
        request.nextUrl.pathname.startsWith('/monitoring/') ||
        request.nextUrl.pathname.startsWith('/api/') ||
        PUBLIC_FILE.test(request.nextUrl.pathname)
    ) {
        return null;
    }

    if (isExcluded(request)) return undefined;
    const locale = getLocale(request);

    // redirect the user to the correct locale
    if (locale.redirect) {
        const host = getHostname(request);
        const relative = request.nextUrl.toString().replace(host, '');
        const separator = relative.startsWith('/') ? '' : '/';

        const redirect = `${host}${`/${locale.code}${separator}${relative}`.replace(/(\/{5,})/g, '/')}`;

        return setPreference(NextResponse.redirect(redirect), locale.code);
    }

    return setPreference(NextResponse.next(), locale.code);
}

export const config = {
    matcher: ['/:path*'],
    //matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)'
    runtime: 'experimental-edge'
};
