import { Error, MissingEnvironmentVariableError, NotFoundError, UnknownError } from '@nordcom/commerce-errors';

import { findShopByDomainOverHttp } from '@/api/shop';
import { ShopifyApiClient } from '@/api/shopify';
import { LocalesApi } from '@/api/store';
import { commonValidations } from '@/middleware/common-validations';
import { BuildConfig } from '@/utils/build-config';
import { NextResponse } from 'next/server';
import { resolveAcceptLanguage } from 'resolve-accept-language';

import type { Code } from '@/utils/locale';
import type { NextRequest } from 'next/server';

function hostnameFromRequest(req: NextRequest): string {
    let hostname = (req.headers.get('host')?.replace('.localhost', '') || req.nextUrl.host || '').toLowerCase();

    // Remove port from hostname.
    hostname = hostname ? hostname.split(':')[0]! : '';

    // Deal with development server and Vercel's preview URLs.
    if (
        !hostname ||
        hostname === 'localhost' ||
        hostname.includes('.vercel.app') ||
        hostname.includes('app.github.dev') ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.0.0.')
    ) {
        hostname = 'swedish-candy-store.com';
    }

    return hostname;
}

export const getHostname = async (req: NextRequest): Promise<string> => {
    const hostname = hostnameFromRequest(req);
    const domain = (await findShopByDomainOverHttp(hostname)).domain;

    if (!domain) {
        throw new NotFoundError(`"Shop" with the handle "${hostname}" cannot be found`);
    }

    return domain;
};

async function setCookies(res: NextResponse, cookies: string[][] = []): Promise<NextResponse> {
    if (cookies.length <= 0) {
        return res;
    }

    cookies.forEach(([key, value]) => res.cookies.set(key, value));
    return res;
}

async function handleCommerceError(req: NextRequest, error: Error) {
    const hostname = hostnameFromRequest(req);

    const newUrl = new URL(req.url);
    newUrl.hostname = (process.env.LANDING_DOMAIN as string) || 'shops.nordcom.io';
    newUrl.protocol = 'https';
    newUrl.port = '443';
    newUrl.pathname = '/status/unknown-error/'; // Default error.
    newUrl.searchParams.set('shop', hostname);

    const headers = new Headers(req.headers);
    headers.set('x-nordcom-shop', hostname);
    if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
        headers.set('x-vercel-protection-bypass', process.env.VERCEL_AUTOMATION_BYPASS_SECRET);
    } else {
        console.warn(new MissingEnvironmentVariableError('VERCEL_AUTOMATION_BYPASS_SECRET'));
    }

    if (Error.isNotFound(error)) {
        newUrl.pathname = '/status/unknown-shop/';
    }

    return NextResponse.rewrite(newUrl, {
        status: error.statusCode || 500,
        request: {
            headers: headers
        }
    });
}

const FILE_TEST = /\.[a-zA-Z]{2,6}$/gi;
const LOCALE_TEST = /\/([a-zA-Z]{2}-[a-zA-Z]{2})/g;
const LOCALE_SLASH_TEST = /\/([a-zA-Z]{2}-[a-zA-Z]{2})\//g;

export const storefront = async (req: NextRequest): Promise<NextResponse> => {
    let newUrl = req.nextUrl.clone();
    let cookies: string[][] = [];

    // Sort the search params to improve caching.
    newUrl.searchParams.sort();

    let hostname: string;
    try {
        hostname = await getHostname(req);
    } catch (error: unknown) {
        console.error(error);

        newUrl.hostname = (process.env.LANDING_DOMAIN as string) || 'shops.nordcom.io';
        newUrl.protocol = 'https';
        newUrl.port = '443';
        newUrl.searchParams.set('shop', hostnameFromRequest(req));

        // Check if we're requesting a file, if so, let it pass.
        if (FILE_TEST.test(newUrl.pathname)) {
            return NextResponse.rewrite(newUrl);
        }

        return handleCommerceError(req, (error as undefined | Error) || new UnknownError(error?.toString?.()));
    }

    // TODO: Do we need to account for the rewrite/reverse proxy?
    if (newUrl.pathname.startsWith(`/${hostname}/`)) {
        newUrl.pathname = newUrl.pathname.replace(`/${hostname}/`, `/`);
        return NextResponse.redirect(newUrl, { status: 301 });
    }

    const isSpecialPath: boolean =
        !!newUrl.pathname.match(FILE_TEST) ||
        newUrl.pathname.includes('/api/') ||
        newUrl.pathname.includes('/slice-simulator') ||
        false;

    // API.
    if (isSpecialPath) {
        // Do not mess with status or headers here.
        newUrl.pathname = `${hostname}${newUrl.pathname}`;
        return NextResponse.rewrite(newUrl);

        // TODO: Handle Handle tenant-specific files/assets.
    }

    // TODO: handle these properly.
    if (newUrl.pathname.startsWith('/en-EU/')) {
        newUrl.pathname = newUrl.pathname.replace('/en-EU/', '/');
    }

    // Set the locale based on the user's accept-language header when no locale
    // is provided (e.g. we get a bare url/path like `/`).
    if (!newUrl.pathname.match(LOCALE_TEST)) {
        let locale = req.cookies.get('localization')?.value || req.cookies.get('NEXT_LOCALE')?.value;

        if (!locale) {
            const shop = await findShopByDomainOverHttp(hostname);
            const api = await ShopifyApiClient({ shop });
            const locales = (await LocalesApi({ api })).map((locale) => locale.code);

            const acceptLanguageHeader = req.headers.get('accept-language');
            if (!acceptLanguageHeader && BuildConfig.environment !== 'production') {
                console.warn(`Invalid or missing "accept-language" header.`, req);
            }

            const defaultLocale = (shop.i18n?.defaultLocale ?? 'en-US') as Code;
            const userLang = resolveAcceptLanguage(acceptLanguageHeader ?? '', locales, defaultLocale, {
                matchCountry: true
            });

            locale = userLang as string;
            if (!locale) {
                // TODO: this can never actually happen, but when we handle i18n properly it will.
                // TODO: find the correct country with another language if available as a fallback.
                throw new Error(`No locale could be found for "${req.nextUrl.href}" and no default locale is set.`);
            }

            // Set locale cookies.
            cookies.push(['localization', locale], ['NEXT_LOCALE', locale]);
        }

        // In a perfect world we'd just set `newUrl.locale` here but
        // since we want to support fully dynamic locales we need to
        // set the locale in the path instead.
        newUrl.pathname = `/${locale}${newUrl.pathname || '/'}`;
    }

    // Validate that we don't now have more than one locale in the path,
    // for example `/en-US/de-DE/en-gb/de-de/about/` which should instead
    // be `/en-US/about/`. This can occur for numerous reasons; for example
    // invalid back-links, a user manually messing up or another thousands
    // of possible reasons.
    const trailingLocales = newUrl.pathname.match(LOCALE_SLASH_TEST);
    if (trailingLocales && trailingLocales.length > 1) {
        for (const locale of trailingLocales.slice(1)) {
            newUrl.pathname = newUrl.pathname.replace(`${locale}`, '');
        }

        // Check if we fixed an occurrence of this issue, if so log it.
        if (newUrl.pathname !== req.nextUrl.pathname) {
            console.warn(`Fixed locale duplication "${req.nextUrl.href}" -> "${newUrl.href}"`);
        }
    }

    // Make sure the path is lowercase, except for the locale of course.
    const withoutLocale = newUrl.pathname.split('/').slice(2).join('/');
    if (withoutLocale.match(/[A-Z]/g)) {
        newUrl.pathname = `/${newUrl.pathname.split('/')[1]}/${withoutLocale.toLowerCase()}/`;
    }

    // Validate the url against our common issues.
    newUrl = commonValidations(newUrl);

    // Validations that doesn't apply to api routes.
    // Make sure the url ends with a trailing slash.
    if (!(newUrl.href.split('?')[0]!.endsWith('/') && newUrl.pathname.endsWith('/'))) {
        newUrl.href = newUrl.href = `${newUrl.href.split('?')[0]}/${newUrl.search}`;
    }

    // Remove `/pages/` from the pathname if it's the second part of the path.
    if (newUrl.pathname.includes('/pages/')) {
        newUrl.pathname = newUrl.pathname.replace('/pages/', '/');
    }

    // Update legacy blog path.
    if (newUrl.pathname.includes('/blog/')) {
        newUrl.pathname = newUrl.pathname.replace('/blog/', '/blogs/news/');
    }

    // Check if `homepage` is explicitly set as the handle, if so remove it.
    if (newUrl.pathname.endsWith('/homepage/')) {
        newUrl.pathname = newUrl.pathname.replace('/homepage/', '/');
    }

    // Redirect if `newURL` is different from `req.nextUrl`.
    if (newUrl.href !== req.nextUrl.href) {
        return setCookies(NextResponse.redirect(newUrl, { status: 301 }), cookies);
    }

    // Rewrite index to use the `homepage` handle.
    if (newUrl.pathname.substring(1).split('/')[1] === '') {
        newUrl.pathname += `homepage/`;
    }

    const target = `${newUrl.origin}/${hostname}${newUrl.pathname}${newUrl.searchParams.size > 0 ? '?' : ''}${newUrl.searchParams.toString()}`;

    return setCookies(NextResponse.rewrite(new URL(target, req.url)), cookies);
};
