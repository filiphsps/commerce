import { ShopApi } from '@/api/shop';
import { ShopifyApiClient, ShopifyApiConfig } from '@/api/shopify';
import { LocalesApi } from '@/api/store';
import { commonValidations } from '@/middleware/common-validations';
import { getHostname } from '@/middleware/router';
import { Locale } from '@/utils/locale';
import AcceptLanguageParser from 'accept-language-parser';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/* c8 ignore start */
const FILE_TEST = /\.[a-zA-Z]{2,6}$/gi;
const LOCALE_TEST = /\/([a-zA-Z]{2}-[a-zA-Z]{2})/g;

export const storefront = async (req: NextRequest): Promise<NextResponse> => {
    const hostname = await getHostname(req);
    const shop = await ShopApi({ domain: hostname });

    let newUrl = req.nextUrl.clone();

    // API.
    if (newUrl.pathname.includes('/api/') && !newUrl.pathname.includes('/storefront/')) {
        // Do not mess with status or headers here.
        return NextResponse.rewrite(
            new URL(`/storefront/${shop.domains.primary}${newUrl.pathname}${newUrl.search}`, req.url)
        );
    }

    // Check if we're dealing with a file, or other specially-handled resource.
    if (newUrl.pathname.match(FILE_TEST) && !newUrl.pathname.includes('/storefront/')) {
        if (newUrl.pathname.startsWith('/assets/')) {
            return NextResponse.next();
        }

        let target = `/storefront/${shop.domains.primary}${newUrl.pathname}${newUrl.search}`;
        return NextResponse.rewrite(new URL(target, req.url), {
            status: 200,
            headers: {
                'Cache-Control': 's-maxage=28800, stale-while-revalidate'
            }
        });

        // TODO: Handle Handle tenant-specific files/assets.
    }

    // Set the locale based on the user's accept-language header when no locale
    // is provided (e.g. we get a bare url/path like `/`).
    if (!newUrl.pathname.match(LOCALE_TEST) && !newUrl.pathname.includes('/api/')) {
        let locale = req.cookies.get('LOCALE')?.value || req.cookies.get('NEXT_LOCALE')?.value;

        if (!locale) {
            const apiConfig = await ShopifyApiConfig({ shop, noHeaders: false });
            const api = await ShopifyApiClient({ shop, apiConfig });
            const locales = (await LocalesApi({ api })).map(({ code }) => code);

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
        newUrl.pathname = `/${locale}${newUrl.pathname}`;
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
    const localeRegex = /([a-zA-Z]{2}-[a-zA-Z]{2})\//gi;
    const trailingLocales = newUrl.pathname.match(localeRegex);
    if (trailingLocales && trailingLocales.length > 1) {
        for (const locale of trailingLocales.slice(1)) {
            newUrl.pathname = newUrl.pathname.replace(`${locale}`, '');
        }

        // Check if we fixed an occurrence of this issue, if so log it.
        if (newUrl.pathname !== req.nextUrl.pathname) {
            console.warn(`Fixed locale duplication "${req.nextUrl.href}" -> "${newUrl.href}"`);
        }
    }

    // Validate the url against our common issues.
    newUrl = commonValidations(newUrl);

    // Redirect if `newURL` is different from `req.nextUrl`.
    if (newUrl.href !== req.nextUrl.href) {
        return NextResponse.redirect(newUrl, { status: 302 });
    }

    // Rewrite index to use the `homepage` handle.
    if (newUrl.pathname.split('/')[2] === '') {
        newUrl.pathname = `${newUrl.pathname}homepage/`;
    }

    const target = `/storefront/${shop.domains.primary}${newUrl.pathname}${newUrl.search}`;
    return NextResponse.rewrite(new URL(target, req.url), {
        headers: { 'Cache-Control': 's-maxage=28800, stale-while-revalidate' }
    });
};
/* c8 ignore stop */
