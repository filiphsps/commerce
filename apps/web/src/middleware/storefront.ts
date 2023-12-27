import { ShopApi } from '@/api/shop';
import { ShopifyApiClient, ShopifyApiConfig } from '@/api/shopify';
import { LocalesApi } from '@/api/store';
import { commonValidations } from '@/middleware/common-validations';
import { getHostname } from '@/middleware/router';
import { Locale } from '@/utils/locale';
import AcceptLanguageParser from 'accept-language-parser';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const FILE_TEST = /\.[a-zA-Z]{2,6}$/gi;
const LOCALE_TEST = /\/([a-zA-Z]{2}-[a-zA-Z]{2})/g;
const LOCALE_SLASH_TEST = /\/([a-zA-Z]{2}-[a-zA-Z]{2})\//g;

export const storefront = async (req: NextRequest): Promise<NextResponse> => {
    const hostname = await getHostname(req);
    const shop = await ShopApi(hostname, true);
    let newUrl = req.nextUrl.clone();
    const params = newUrl.searchParams.toString();
    const search = params.length > 0 ? `?${params}` : '';

    // Redirect to the primary domain if the hostname doesn't match.
    if (hostname !== shop.domains.primary) {
        newUrl.hostname = shop.domains.primary;
    }

    // API.
    if (
        newUrl.pathname.match(FILE_TEST) ||
        newUrl.pathname.includes('/api') ||
        newUrl.pathname.includes('/slice-simulator')
    ) {
        // Do not mess with status or headers here.
        let target = `${newUrl.origin}/storefront/${shop.domains.primary}${newUrl.pathname}${search}`;
        return NextResponse.rewrite(new URL(target, req.url));

        // TODO: Handle Handle tenant-specific files/assets.
    }

    // Set the locale based on the user's accept-language header when no locale
    // is provided (e.g. we get a bare url/path like `/`).
    if (!newUrl.pathname.match(LOCALE_TEST)) {
        let locale = req.cookies.get('LOCALE')?.value || req.cookies.get('NEXT_LOCALE')?.value;

        if (!locale) {
            const apiConfig = await ShopifyApiConfig({ shop, noHeaders: false, noCache: true });
            const api = await ShopifyApiClient({ shop, apiConfig });
            const locales = (await LocalesApi({ api, noCache: true })).map(({ code }) => code);

            const acceptLanguageHeader = req.headers.get('accept-language') || '';
            const userLang = AcceptLanguageParser.pick(locales, acceptLanguageHeader);

            locale = userLang || locales.at(0);
            if (!locale) {
                throw new Error(`No locale could be found for "${req.nextUrl.href}" and no default locale is set.`);
            }
        }

        // TODO: Set the locale in the cookie here.

        // In a perfect world we'd just set `newUrl.locale` here but
        // since we want to support fully dynamic locales we need to
        // set the locale in the path instead.
        newUrl.pathname = `/${locale}${newUrl.pathname || '/'}`;
    }

    // Replace locale with locale from cookie if it doesn't match.
    const locale = !!req.cookies.get('LOCALE') ? Locale.from(req.cookies.get('LOCALE')!.value!) : undefined;
    if (locale && newUrl.pathname.match(LOCALE_TEST)) {
        const urlLocale = newUrl.pathname.match(LOCALE_TEST)?.[0].replace('/', '');
        if (urlLocale && urlLocale !== locale.code) {
            newUrl.pathname = newUrl.pathname.replace(LOCALE_TEST, `/${locale.code}`);
        }
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

    // Make sure the url ends with a trailing slash.
    if (!(newUrl.href.split('?')[0]!.endsWith('/') && newUrl.pathname.endsWith('/'))) {
        newUrl.href = newUrl.href = `${newUrl.href.split('?')[0]}/${newUrl.search}`;
    }

    // Redirect if `newURL` is different from `req.nextUrl`.
    if (newUrl.href !== req.nextUrl.href) {
        return NextResponse.redirect(newUrl, { status: 302 });
    }

    // Rewrite index to use the `homepage` handle.
    if (newUrl.pathname.split('/')[2] === '' && !newUrl.pathname.includes('slice-simulator')) {
        newUrl.pathname += `homepage/`;
    }

    const target = `${newUrl.origin}/storefront/${shop.domains.primary}${newUrl.pathname}${search}`;
    return NextResponse.rewrite(new URL(target, req.url));
};
