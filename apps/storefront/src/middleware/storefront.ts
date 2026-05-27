import { Shop } from '@nordcom/commerce-db';
import { Error, NoLocaleResolvableError, NotFoundError, UnknownError } from '@nordcom/commerce-errors';
import { isLocalhost, shopFromHost } from '@nordcom/commerce-utils';
import { trace } from '@opentelemetry/api';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { resolveAcceptLanguage } from 'resolve-accept-language';
import { getGlobalServiceDomain } from '@/api/shop';
import { ShopifyApiClient } from '@/api/shopify';
import { LocalesApi } from '@/api/store';
import { commonValidations } from '@/middleware/common-validations';
import type { Code } from '@/utils/locale';

let cachedDevShopDomain: Promise<string> | undefined;

/**
 * Resolves the shop domain that `*.storefront.localhost` should rewrite to
 * during local dev. Honours `STOREFRONT_DEV_SHOP` when set; otherwise picks
 * the first Shop present in MongoDB — which, after `pnpm predev`, is the
 * canonical seed (`nordcom-demo-shop.com`). The result is cached for the
 * process lifetime so we don't re-query Mongo on every request.
 *
 * @returns The resolved dev shop domain, falling back to a hard-coded
 *          beta tenant if neither env nor Mongo provides one.
 */
async function resolveDevShopDomain(): Promise<string> {
    if (process.env.STOREFRONT_DEV_SHOP) return process.env.STOREFRONT_DEV_SHOP;
    if (cachedDevShopDomain) return cachedDevShopDomain;
    cachedDevShopDomain = (async () => {
        try {
            const shops = await Shop.findAll();
            const seeded = shops[0]?.domain;
            if (seeded) {
                trace.getActiveSpan()?.addEvent('middleware.dev_shop_resolved_from_seed', { domain: seeded });
                return seeded;
            }
        } catch (err) {
            trace.getActiveSpan()?.addEvent('middleware.dev_shop_lookup_failed', {
                'error.message': (err as { message?: string }).message ?? String(err),
            });
        }
        return 'beta.pouched.de';
    })();
    return cachedDevShopDomain;
}

async function hostnameFromRequest(req: NextRequest): Promise<string> {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;

    // Bare `localhost[:port]` (the e2e webServer in CI, plus any developer
    // hitting `next start` directly) has no shop segment to parse, so fall
    // back to the same dev-shop resolution as `*.storefront.localhost`.
    if (host.endsWith('storefront.localhost') || isLocalhost(host)) {
        return resolveDevShopDomain();
    }

    return shopFromHost(host);
}

export const getHostname = async (req: NextRequest): Promise<string> => {
    const hostname = await hostnameFromRequest(req);
    const domain = (await Shop.findByDomain(hostname, { sensitiveData: true })).domain;

    if (!domain) {
        throw new NotFoundError(`"Shop" with the handle "${hostname}" cannot be found`);
    }

    return domain;
};

async function setCookies(res: NextResponse, cookies: string[][] = []): Promise<NextResponse> {
    if (cookies.length <= 0) {
        return res;
    }

    cookies.forEach(([key, value]) => void res.cookies.set(key, value));
    return res;
}

async function handleCommerceError(req: NextRequest, error: Error) {
    const hostname = await hostnameFromRequest(req);

    // `getGlobalServiceDomain()` throws when `SERVICE_DOMAIN` is unset. The
    // previous code let that throw bubble through the error handler — so a
    // misconfigured deployment turned every "unknown shop" / commerce error
    // into an uncaught 500 from the edge middleware, hiding the real cause.
    // Fall back to a plain 503 so the misconfiguration is obvious in logs.
    let serviceDomain: string;
    try {
        serviceDomain = getGlobalServiceDomain();
    } catch (envError) {
        trace.getActiveSpan()?.addEvent('middleware.service_domain_unavailable', {
            'error.message': (envError as { message?: string }).message ?? 'misconfiguration',
        });
        return new NextResponse(
            `Service unavailable: ${(envError as { message?: string }).message ?? 'misconfiguration'}`,
            { status: 503, headers: { 'Cache-Control': 'no-store' } },
        );
    }

    const newUrl = new URL(req.url);
    newUrl.hostname = serviceDomain;
    newUrl.protocol = 'https';
    newUrl.port = '443';
    newUrl.pathname = '/status/unknown-error/'; // Default error.
    newUrl.searchParams.set('shop', hostname);

    const headers = new Headers(req.headers);
    headers.set('x-nordcom-shop', hostname);
    if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
        headers.set('x-vercel-protection-bypass', process.env.VERCEL_AUTOMATION_BYPASS_SECRET);
    } else {
        trace.getActiveSpan()?.addEvent('middleware.missing_env', {
            'env.name': 'VERCEL_AUTOMATION_BYPASS_SECRET',
        });
    }

    if (Error.isNotFound(error)) {
        newUrl.pathname = '/status/unknown-shop/';
    }

    return NextResponse.rewrite(newUrl, {
        status: error.statusCode || 500,
        request: {
            headers: headers,
        },
    });
}

// Don't add the `g` flag here. `.test()` on a `g`-flagged regex preserves
// `lastIndex` between calls — and these regexes are module-scoped, so a hit
// on one request leaves the cursor mid-string and the next request's `.test()`
// can falsely return `false` against the same input. Plain regexes are
// stateless and safe to share.
const FILE_TEST = /\.[a-zA-Z]{2,6}$/i;
const LOCALE_TEST = /\/([a-zA-Z]{2}-[a-zA-Z]{2})/;
const LOCALE_SLASH_TEST = /\/([a-zA-Z]{2}-[a-zA-Z]{2})\//g;

export const storefront = async (req: NextRequest): Promise<NextResponse> => {
    let newUrl = req.nextUrl.clone();
    const cookies: string[][] = [];

    // Sort the search params to improve caching.
    newUrl.searchParams.sort();

    let hostname: string;
    try {
        hostname = await getHostname(req);
    } catch (error: unknown) {
        trace.getActiveSpan()?.addEvent('middleware.hostname_resolution_failed', {
            'error.message': (error as { message?: string }).message ?? String(error),
        });

        // `getGlobalServiceDomain()` throws if SERVICE_DOMAIN is unset, so we
        // can't unconditionally call it inline — that would turn a missing
        // env var into a 500 on every unknown-shop request, masking the real
        // problem. Defer the service-domain rewrite to handleCommerceError
        // (which now degrades gracefully), and only short-circuit asset
        // requests when we actually have a service domain to fall back to.
        try {
            const serviceDomain = getGlobalServiceDomain();
            if (FILE_TEST.test(newUrl.pathname)) {
                newUrl.hostname = serviceDomain;
                newUrl.protocol = 'https';
                newUrl.port = '443';
                newUrl.searchParams.set('shop', await hostnameFromRequest(req));
                return NextResponse.rewrite(newUrl);
            }
        } catch (envError) {
            trace.getActiveSpan()?.addEvent('middleware.service_domain_unset_file_passthrough_skipped', {
                'error.message': (envError as { message?: string }).message ?? String(envError),
            });
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
            const shop = await Shop.findByDomain(hostname, { sensitiveData: true });
            const api = await ShopifyApiClient({ shop });
            const locales = (await LocalesApi({ api })).map((locale) => locale.code);

            const acceptLanguageHeader = req.headers.get('accept-language');
            const defaultLocale = (shop.i18n?.defaultLocale ?? 'en-US') as Code;
            // `resolveAcceptLanguage` throws if `defaultLocale` is missing from
            // the locales array. The shop's configured default isn't always
            // present in Shopify's `availableCountries × availableLanguages`
            // matrix, so merge it in defensively.
            const resolvableLocales = locales.includes(defaultLocale) ? locales : [...locales, defaultLocale];
            const userLang = resolveAcceptLanguage(acceptLanguageHeader ?? '', resolvableLocales, defaultLocale, {
                matchCountry: true,
            });

            locale = userLang as string;
            if (!locale) {
                // TODO: this can never actually happen, but when we handle i18n properly it will.
                // TODO: find the correct country with another language if available as a fallback.
                throw new NoLocaleResolvableError(req.nextUrl.href);
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

        // Check if we fixed an occurrence of this issue, if so record it.
        if (newUrl.pathname !== req.nextUrl.pathname) {
            trace.getActiveSpan()?.addEvent('middleware.locale_duplication_fixed', {
                original: req.nextUrl.href,
                normalized: newUrl.href,
            });
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
    const [hrefWithoutQuery = ''] = newUrl.href.split('?');
    if (!(hrefWithoutQuery.endsWith('/') && newUrl.pathname.endsWith('/'))) {
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

    // Extract locale from the path (first segment after the leading slash).
    const localeFromPath = newUrl.pathname.split('/').filter(Boolean)[0] ?? '';

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-shop-domain', hostname);
    requestHeaders.set('x-locale', localeFromPath);

    const search = newUrl.searchParams.size > 0 ? `?${newUrl.searchParams.toString()}` : '';
    // Our target URL.
    const target = `${newUrl.origin}/${hostname}${newUrl.pathname}${search}`;

    return setCookies(NextResponse.rewrite(new URL(target, newUrl), { request: { headers: requestHeaders } }), cookies);
};
