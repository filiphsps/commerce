import { ShopApi } from '@/api/shop';
import { commonValidations } from '@/middleware/common-validations';
import { getHostname } from '@/middleware/router';
import AcceptLanguageParser from 'accept-language-parser';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/* c8 ignore start */
const locales = [...(process.env.STORE_LOCALES ? [...process.env.STORE_LOCALES.split(',')] : ['en-US'])];

const FILE_TEST = /\.[a-zA-Z]{2,6}$/gi;
const LOCALE_TEST = /\/([a-zA-Z]{2}-[a-zA-Z]{2})/gi;

export const storefront = async (req: NextRequest): Promise<NextResponse> => {
    const hostname = await getHostname(req);
    const shop = await ShopApi({ domain: hostname });

    let newUrl = req.nextUrl.clone();

    // Handle API requests.
    if (newUrl.pathname.startsWith('/api/')) {
        return NextResponse.rewrite(
            new URL(`/storefront/${shop.domains.primary}${newUrl.pathname}${newUrl.search}`, req.url)
        );
    }

    // Check if we're dealing with a file or route.
    if (newUrl.pathname.match(FILE_TEST)) {
        let target = `${newUrl.pathname}${newUrl.search}`;
        // TODO: Handle Handle tenant-specific assets.

        // Favicon.
        if (newUrl.pathname.endsWith('favicon.png')) {
            target = `/storefront/${shop.domains.primary}${newUrl.pathname}${newUrl.search}`;
            return NextResponse.rewrite(new URL(target, req.url), {
                status: 200,
                headers: {
                    'Cache-Control': 's-maxage=28800, stale-while-revalidate'
                }
            });
        }

        // Sitemap.
        if (newUrl.pathname.endsWith('dynamic-sitemap.xml')) {
            target = `/storefront/${shop.domains.primary}/dynamic-sitemap.xml${newUrl.search}`;
            return NextResponse.rewrite(new URL(target, req.url), { status: 200 });
        }

        // FIXME: Don't hardcode `sweetsideofsweden.com`
        target = `/sweetsideofsweden.com${target}`;
        return NextResponse.rewrite(new URL(target, req.url), {
            headers: {
                'Cache-Control': 's-maxage=28800, stale-while-revalidate'
            }
        });
    }

    // Set the locale based on the user's accept-language header when no locale
    // is provided (e.g. we get a bare url/path like `/`).
    if (!newUrl.pathname.match(LOCALE_TEST) && !newUrl.pathname.includes('/api/')) {
        // Make sure it's not a file
        const acceptLanguageHeader = req.headers.get('accept-language') || '';
        // FIXME: This should be dynamic, not based on a build-time configuration.
        //        Maybe we can use edge config for this?..
        const userLang = AcceptLanguageParser.pick(locales, acceptLanguageHeader);
        const savedLocale = req.cookies.get('LOCALE')?.value || req.cookies.get('NEXT_LOCALE')?.value;
        const locale = savedLocale || userLang || locales.at(0);
        if (!locale) {
            throw new Error(`No locale could be found for "${req.nextUrl.href}" and no default locale is set.`);
        }

        // In a perfect world we'd just set `newUrl.locale` here but
        // since we want to support fully dynamic locales we need to
        // set the locale in the path instead.
        newUrl.pathname = `/${locale}${newUrl.pathname}`;
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
