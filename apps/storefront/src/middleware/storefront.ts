import { findShopByDomainOverHttp } from '@/api/shop';
import { ShopifyApiClient, ShopifyApiConfig } from '@/api/shopify';
import { LocalesApi } from '@/api/store';
import { commonValidations } from '@/middleware/common-validations';
import { NextResponse } from 'next/server';
import { resolveAcceptLanguage } from 'resolve-accept-language';

import type { NextRequest } from 'next/server';

export const getHostname = async (req: NextRequest): Promise<string> => {
    let hostname = (req.headers.get('host')?.replace('.localhost', '') || req.nextUrl.host || '').toLowerCase();

    // Remove port from hostname.
    hostname = hostname ? hostname.split(':')[0]! : '';

    // Deal with development server and Vercel's preview URLs.
    if (
        !hostname ||
        hostname === 'localhost' ||
        hostname.includes('vercel.app') ||
        hostname.includes('app.github.dev')
    ) {
        return 'staging.swedish-candy-store.com';
    }

    try {
        const shop = await findShopByDomainOverHttp(hostname);
        return shop.domain;
    } catch (error: unknown) {
        console.error(error);

        return hostname;
    }
};

const FILE_TEST = /\.[a-zA-Z]{2,6}$/gi;
const LOCALE_TEST = /\/([a-zA-Z]{2}-[a-zA-Z]{2})/g;
const LOCALE_SLASH_TEST = /\/([a-zA-Z]{2}-[a-zA-Z]{2})\//g;

export const storefront = async (req: NextRequest): Promise<NextResponse> => {
    const hostname = await getHostname(req);
    let newUrl = req.nextUrl.clone();
    const params = newUrl.searchParams.toString();
    const search = params.length > 0 ? `?${params}` : '';

    const isSpecialPath: boolean =
        (newUrl.pathname.match(FILE_TEST) || []).length > 0 ||
        newUrl.pathname.includes('/api') ||
        newUrl.pathname.includes('/slice-simulator') ||
        newUrl.pathname.includes('/.well-known') ||
        false;

    // API.
    if (isSpecialPath) {
        // Do not mess with status or headers here.
        newUrl.pathname = `${hostname}${newUrl.pathname}${search}`;
        return NextResponse.rewrite(newUrl);

        // TODO: Handle Handle tenant-specific files/assets.
    }

    // Set the locale based on the user's accept-language header when no locale
    // is provided (e.g. we get a bare url/path like `/`).
    if (!newUrl.pathname.match(LOCALE_TEST)) {
        let locale = req.cookies.get('localization')?.value || req.cookies.get('NEXT_LOCALE')?.value;

        if (!locale) {
            const shop = await findShopByDomainOverHttp(hostname);

            const apiConfig = await ShopifyApiConfig({ shop });
            const api = await ShopifyApiClient({ shop, apiConfig });
            const locales = (await LocalesApi({ api })).map((locale) => locale.code);

            const acceptLanguageHeader = req.headers.get('accept-language') || req.headers.get('Accept-Language');
            if (!acceptLanguageHeader) {
                console.warn(`Invalid or missing "accept-language" header.`, req);
            }

            const userLang = resolveAcceptLanguage(acceptLanguageHeader ?? '', locales, 'en-US'); // FIXME: Tenant-configurable default locale.
            locale = (userLang as any) || locales.at(0);

            if (!locale) {
                // TODO: find the correct country with another language if available as a fallback.
                throw new Error(`No locale could be found for "${req.nextUrl.href}" and no default locale is set.`);
            }
        }

        // Set locale cookie.
        req.cookies.set('localization', locale);

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

    // Redirect if `newURL` is different from `req.nextUrl`.
    if (newUrl.href !== req.nextUrl.href) {
        return NextResponse.redirect(newUrl, { status: 301 });
    }

    // Rewrite index to use the `homepage` handle.
    if (newUrl.pathname.split('/')[2] === '') {
        newUrl.pathname += `homepage/`;
    }

    const target = `${newUrl.origin}/${hostname}${newUrl.pathname}${search}`;
    return NextResponse.rewrite(new URL(target, req.url));
};
