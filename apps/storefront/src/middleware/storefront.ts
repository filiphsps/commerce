import { Shop } from '@nordcom/commerce-db';
import { Error, NoLocaleResolvableError, NotFoundError, UnknownError } from '@nordcom/commerce-errors';
import { isDevHost, shopFromHost } from '@nordcom/commerce-utils';
import { trace } from '@opentelemetry/api';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { resolveAcceptLanguage } from 'resolve-accept-language';
import { getGlobalServiceDomain } from '@/api/shop';
import { ShopifyApiClient } from '@/api/shopify';
import { LocalesApi } from '@/api/store';
import { commonValidations } from '@/middleware/common-validations';
import type { ShopResolution } from '@/middleware/shop-cache';
import { invalidateShop, MAX_ENTRIES, resolveShop, resolveShopLocales } from '@/middleware/shop-cache';
import type { Code } from '@/utils/locale';

let cachedDevShopDomain: Promise<string> | undefined;

/**
 * Resolves the shop domain that `*.storefront.localhost` should rewrite to
 * during local dev. Honours `STOREFRONT_DEV_SHOP` when set; otherwise picks
 * the first Shop the Convex-backed Shop service returns — which, after
 * `pnpm predev`, is the canonical seed (`nordcom-demo-shop.com`). The result
 * is cached for the process lifetime so we don't re-query the backend on
 * every request.
 *
 * @returns The resolved dev shop domain, falling back to a hard-coded
 *          beta tenant if neither env nor the backend provides one.
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

/**
 * Extracts the effective shop hostname from an incoming request. On dev hosts
 * (`localhost`, `.test`, etc.) falls back to the dev-shop resolution so
 * any subdomain form (including `storefront.localhost:1337`) resolves
 * correctly without requiring a real Shopify shop.
 *
 * @param req - The incoming Next.js edge request.
 * @returns The resolved shop hostname for tenant lookup.
 */
async function hostnameFromRequest(req: NextRequest): Promise<string> {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;

    // Any dev TLD (`localhost`, `.localhost`, `.test`) — bare port-suffixed or
    // subdomain form — has no real shop segment to parse, so fall back to the
    // dev-shop resolution. `isDevHost` normalizes the port suffix so the
    // Playwright non-CI baseURL `storefront.localhost:1337` matches; the prior
    // `host.endsWith('storefront.localhost')` check missed it.
    if (isDevHost(host)) {
        return resolveDevShopDomain();
    }

    return shopFromHost(host);
}

/**
 * Last summary observed per hostname, kept so a cache reload can detect the
 * shop's routing identity (canonical domain or default locale) changing.
 * Bounded to the same entry budget as the shop cache so a long-lived process
 * serving many tenants stays flat; only resolvable shops are ever recorded.
 */
const lastSeenResolutions = new Map<string, ShopResolution>();

/**
 * Records the freshly loaded summary for a hostname and, when it differs from
 * the previously observed one, drops both cached views via
 * {@link invalidateShop}. The locale list is cached five times longer than the
 * summary (300 s vs 60 s), so without this a shop whose domain or default
 * locale changed would keep serving the stale locale set until that longer TTL
 * lapsed; invalidating here makes the very next resolution reload it.
 *
 * @param hostname - The request hostname the summary was loaded for.
 * @param resolution - The summary that just came back from the Shop service.
 */
function trackResolutionChange(hostname: string, resolution: ShopResolution): void {
    const previous = lastSeenResolutions.get(hostname);
    if (previous && (previous.domain !== resolution.domain || previous.defaultLocale !== resolution.defaultLocale)) {
        invalidateShop(hostname);
    }
    // Re-insert at the tail so eviction below drops the least-recently-loaded key.
    lastSeenResolutions.delete(hostname);
    lastSeenResolutions.set(hostname, resolution);
    while (lastSeenResolutions.size > MAX_ENTRIES) {
        const oldest = lastSeenResolutions.keys().next().value;
        if (oldest === undefined) break;
        lastSeenResolutions.delete(oldest);
    }
}

/**
 * Drops the per-hostname change-tracking state behind {@link trackResolutionChange}.
 * Test-only companion to `clearShopCache()` — module state would otherwise leak
 * a previous test's resolution into the change detector.
 */
export function resetShopResolutionTracking(): void {
    lastSeenResolutions.clear();
}

/**
 * Resolves (and process-caches) the existence + default-locale summary for a
 * hostname via the Convex-backed Shop service. The lookup masks credentials
 * (`sensitiveData: false`) because this validation path only reads `domain`
 * and `i18n.defaultLocale`; the credential doc is fetched separately, only
 * when a cookie-less request must build a Shopify client (see
 * {@link resolveLocaleCodes}). An unknown host rejects so it is only briefly
 * negatively cached, keeping newly added tenants resolvable.
 *
 * @param hostname - The resolved request hostname to look up.
 * @returns The cached or freshly loaded shop summary.
 * @throws {NotFoundError} When no shop claims the hostname.
 */
function resolveShopSummary(hostname: string): Promise<ShopResolution> {
    return resolveShop(hostname, async () => {
        // This path only reads `domain` + `i18n.defaultLocale`; project to those two fields so the
        // existence check never pulls the full tenant document. `convert: false` keeps the raw lean
        // doc since the masking pipeline expects every field to be present.
        const shop = await Shop.findByDomain(hostname, {
            sensitiveData: false,
            convert: false,
            projection: { domain: 1, 'i18n.defaultLocale': 1 },
        });
        if (!shop.domain) {
            throw new NotFoundError(`"Shop" with the handle "${hostname}" cannot be found`);
        }
        const resolution: ShopResolution = { domain: shop.domain, defaultLocale: shop.i18n?.defaultLocale ?? 'en-US' };
        trackResolutionChange(hostname, resolution);
        return resolution;
    });
}

/**
 * Resolves (and process-caches) the supported locale codes for a hostname. The
 * loader needs the credential doc to build a Shopify client for the locale
 * round-trip, so a cache hit lets cookie-less requests for a known shop skip
 * both the credential lookup and the round-trip entirely.
 *
 * @param hostname - The resolved request hostname whose locales are needed.
 * @returns The cached or freshly loaded list of locale codes.
 */
function resolveLocaleCodes(hostname: string): Promise<string[]> {
    return resolveShopLocales(hostname, async () => {
        const shop = await Shop.findByDomain(hostname, { sensitiveData: true });
        const api = await ShopifyApiClient({ shop });
        return (await LocalesApi({ api })).map((locale) => locale.code);
    });
}

/**
 * Resolves the canonical shop domain from a request, verifying it exists in
 * the Convex `shops` table before returning it. Backed by a process-level
 * cache so the validation lookup does not hit Convex on every matched request.
 *
 * @param req - The incoming request (the proxy runs on the Node.js runtime).
 * @returns The verified shop domain string.
 * @throws {NotFoundError} When no shop with the resolved hostname exists in the database.
 */
export const getHostname = async (req: NextRequest): Promise<string> => {
    const hostname = await hostnameFromRequest(req);
    const { domain } = await resolveShopSummary(hostname);
    return domain;
};

/**
 * Applies a batch of key/value pairs as cookies on an existing response.
 * Returns the response unchanged when the list is empty.
 *
 * @param res - The Next.js response to mutate.
 * @param cookies - An array of `[key, value]` pairs to set on the response.
 * @returns The same response with the cookies applied.
 */
async function setCookies(res: NextResponse, cookies: string[][] = []): Promise<NextResponse> {
    if (cookies.length <= 0) {
        return res;
    }

    cookies.forEach(([key, value]) => void res.cookies.set(key, value));
    return res;
}

/**
 * Builds an error-page rewrite response for a commerce error. Rewrites to
 * the global service domain's status pages so tenants see a branded error
 * instead of a raw Next.js error overlay. Degrades to a 503 response when
 * the `SERVICE_DOMAIN` env var is not set.
 *
 * @param req - The incoming Next.js edge request, used to derive the shop hostname.
 * @param error - The commerce error to respond to; `NotFoundError` maps to `/status/unknown-shop/`.
 * @returns A `NextResponse.rewrite` to the appropriate error page, or a 503 response on misconfiguration.
 */
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

/**
 * Tenant-aware storefront middleware. Resolves the request hostname to a
 * shop, injects the locale into the URL path (reading the `localization`
 * cookie or the `Accept-Language` header when absent), normalizes URL
 * casing and trailing slashes, then rewrites the request to the tenanted
 * App Router path `/[domain]/[locale]/…`.
 *
 * @param req - The incoming Next.js edge request.
 * @returns A redirect, rewrite, or error response depending on tenant and locale resolution.
 * @throws {NoLocaleResolvableError} When no supported locale can be resolved for the request URL.
 */
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
            // `resolveShopSummary` is already populated by `getHostname` above,
            // so the default-locale read is a cache hit; only the locale list may
            // require the Shopify round-trip (and only on a cold cache).
            const [{ defaultLocale: defaultLocaleCode }, locales] = await Promise.all([
                resolveShopSummary(hostname),
                resolveLocaleCodes(hostname),
            ]);

            const acceptLanguageHeader = req.headers.get('accept-language');
            const defaultLocale = defaultLocaleCode as Code;
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
