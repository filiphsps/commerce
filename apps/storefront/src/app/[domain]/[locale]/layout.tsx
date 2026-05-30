import '../../globals.css';

import type { OnlineShop } from '@nordcom/commerce-db';
import { resolveTheme, THEME_DEFAULTS } from '@nordcom/commerce-db';
import { Error, UnknownShopDomainError } from '@nordcom/commerce-errors';
import type { Viewport } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { draftMode } from 'next/headers';
import { notFound, unstable_rethrow } from 'next/navigation';
import type { ReactNode } from 'react';
import { Fragment, Suspense } from 'react';
import { CountriesApi, LocaleApi, LocalesApi, Shop } from '@/api/_loaders';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { dispatch as dispatchCartMutation } from '@/app/[domain]/[locale]/_actions/cart';
import { tenantRootTags } from '@/cache';
import type { AppCartCaps } from '@/cart/caps';
import { CartClientShell } from '@/cart/cart-client-shell';
import { resolveContext } from '@/cart/context';
import { cartKernel, readCart } from '@/cart/kernel';
import { AnalyticsProvider } from '@/components/analytics-provider';
import { GeoRedirect } from '@/components/geo-redirect';
import { HeaderProvider } from '@/components/header/header-provider';
import { JsonLd } from '@/components/json-ld';
import ShopLayout from '@/components/layout/shop-layout';
import PageContent from '@/components/page-content';
import ProvidersRegistry from '@/components/providers-registry';
import { getDictionary } from '@/i18n/dictionary';
import { CssVariablesProvider, getBrandingColors } from '@/utils/css-variables';
import { resolveFontClassName } from '@/utils/fonts';
import { NOT_FOUND_HANDLE } from '@/utils/handle';
import { Locale } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import { PreviewThemeBridge } from './preview-theme-bridge';

export type LayoutParams = Promise<{ domain: string; locale: string }>;

export { generateMetadata } from './metadata';
export { generateStaticParams } from './static-params';

export const viewport: Viewport = {
    initialScale: 1,
    interactiveWidget: 'resizes-content',
    viewportFit: 'cover',
    width: 'device-width',
};

/**
 * Resolves a tenant's typography tokens for the `<html>` font class, cached at `max`.
 *
 * The root layout runs before any request-data read, so calling `Shop.findByDomain`
 * directly trips the prerender current-time guard — mongoose's `.exec()` reads
 * `new Date()` deep in the driver, which Cache Components forbids before request data.
 * Wrapping the lookup in `'use cache'` makes that clock read part of cache creation
 * (allowed), and the cached typography is tagged with the tenant-root tags so an admin
 * theme/font edit evicts it. A theme-less or unknown domain falls back to the platform
 * default, keeping the class byte-identical and letting `CachedShell` stay the sole
 * `notFound()` authority.
 *
 * @param domain - The tenant hostname to resolve.
 * @returns The resolved typography tokens, or the platform default on any failure.
 */
async function resolveTenantTypography(domain: string): Promise<ReturnType<typeof resolveTheme>['typography']> {
    'use cache';
    cacheLife('max');

    try {
        const shop = await Shop.findByDomain(domain);
        cacheTag(...tenantRootTags(shop));
        return resolveTheme(shop).typography;
    } catch {
        return THEME_DEFAULTS.typography;
    }
}

export default async function RootLayout({
    children,
    modal,
    params,
}: Readonly<{ children: ReactNode; modal: ReactNode; params: LayoutParams }>) {
    const { domain, locale: localeData } = await params;
    if (!domain || domain === NOT_FOUND_HANDLE) {
        notFound();
    }

    let locale: Locale;
    try {
        locale = Locale.from(localeData);
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        unstable_rethrow(error);
        throw error;
    }

    // Resolve the tenant's body/heading fonts for the `<html>` class via the cached helper, which
    // keeps the mongoose clock read out of the prerender current-time guard. A theme-less shop
    // resolves to the platform-default font, leaving the class byte-identical to the pre-theming
    // markup; `CachedShell` remains the single authority that emits `notFound()`.
    const typography = await resolveTenantTypography(domain);

    return (
        <html lang={locale.code} className={cn(resolveFontClassName(typography), 'overscroll-x-none')}>
            <head>
                {/* Storefront media is served straight from Shopify's image CDN; opening the TLS
                    connection early shaves the handshake off the first product/hero image fetch. */}
                <link rel="preconnect" href="https://cdn.shopify.com" crossOrigin="anonymous" />
                <link rel="dns-prefetch" href="https://cdn.shopify.com" />
            </head>
            <body className="group/body overflow-x-hidden overscroll-x-none">
                <Suspense fallback={null}>
                    <PreviewThemeBridgeGate />
                </Suspense>

                <Suspense fallback={null}>
                    <CartIsland>
                        <CachedShell domain={domain} locale={locale} modal={modal}>
                            {children}
                        </CachedShell>
                    </CartIsland>
                </Suspense>
            </body>
        </html>
    );
}

/**
 * Mounts the live-preview bridge only while the CMS preview/draft cookie is set.
 *
 * Reading `draftMode()` is the request-state signal that this storefront is being
 * rendered inside the admin theme editor's iframe (the cookie is toggled by
 * `cms-preview/route.ts`). Gating on it keeps the `postMessage` listener — and its
 * cross-origin attack surface — out of the public, statically-cached storefront.
 * The admin origin is resolved server-side so the secret-free origin allowlist
 * never relies on a client-readable env var: `ADMIN_ORIGIN` (a full origin incl.
 * scheme/port) wins when set, else it is constructed from `ADMIN_DOMAIN` over
 * https. The override exists because the constructed `https://<domain>` cannot
 * express a non-https or ported admin deployment, and a mismatched origin makes
 * the bridge silently drop every preview message.
 *
 * @returns The {@link PreviewThemeBridge} when draft mode is active, otherwise `null`.
 */
async function PreviewThemeBridgeGate() {
    const { isEnabled } = await draftMode();
    if (!isEnabled) {
        return null;
    }

    const adminOrigin = process.env.ADMIN_ORIGIN ?? `https://${process.env.ADMIN_DOMAIN ?? 'admin.localhost'}`;
    return <PreviewThemeBridge adminOrigin={adminOrigin} />;
}

async function CartIsland({ children }: { children: ReactNode }) {
    const ctx = await resolveContext();
    const initial = await readCart(ctx);
    return (
        <CartClientShell
            kernelSnapshot={{
                type: cartKernel.type,
                capabilities: cartKernel.capabilities as AppCartCaps,
                customMutationNames: cartKernel.capabilities.customMutations,
            }}
            submitMutation={dispatchCartMutation}
            initialCart={initial}
            shopId={ctx.shop.id}
        >
            {children}
        </CartClientShell>
    );
}

async function CachedShell({
    children,
    modal,
    domain,
    locale,
}: {
    children: ReactNode;
    modal: ReactNode;
    domain: string;
    locale: Locale;
}) {
    'use cache';
    cacheLife('max');

    let shop: OnlineShop;
    try {
        shop = await Shop.findByDomain(domain);
    } catch (error: unknown) {
        if (Error.isNotFound(error) || error instanceof UnknownShopDomainError) {
            notFound();
        }

        unstable_rethrow(error);
        throw error;
    }

    const api = await ShopifyApolloApiClient({ shop, locale });

    let locales: Locale[];
    try {
        locales = await LocalesApi({ api });
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        unstable_rethrow(error);
        throw error;
    }

    // Make sure that the current locale is a valid and active locale.
    if (!locales.map((locale) => locale.code).includes(locale.code)) {
        notFound();
    }

    const [, countries, branding, i18n] = await Promise.all([
        LocaleApi({ api }),
        CountriesApi({ api }),
        getBrandingColors({ domain, shop }),
        getDictionary(locale),
    ]);

    return (
        <ProvidersRegistry shop={shop} locale={locale} domain={domain}>
            <Suspense fallback={<Fragment />}>
                <CssVariablesProvider domain={domain} shop={shop} />
            </Suspense>

            <AnalyticsProvider shop={shop} hostname={domain}>
                <HeaderProvider loaderColor={branding?.primary.color}>
                    <Fragment key="layout.modal">{modal}</Fragment>

                    <Suspense key="layout.geo-redirect" fallback={<Fragment />}>
                        <GeoRedirect shop={shop} countries={countries} locale={locale} i18n={i18n} />
                    </Suspense>

                    <Suspense key="layout.shop-layout" fallback={<ShopLayout.skeleton />}>
                        <ShopLayout shop={shop} locale={locale} i18n={i18n}>
                            <PageContent as="article" primary={true}>
                                {children}
                            </PageContent>
                        </ShopLayout>
                    </Suspense>

                    <JsonLd
                        data={{
                            '@context': 'http://schema.org',
                            '@type': 'WebSite',
                            url: `https://${shop.domain}/${locale.code}/`,
                            name: shop.name,
                            potentialAction: {
                                '@type': 'SearchAction',
                                target: {
                                    '@type': 'EntryPoint',
                                    urlTemplate: `https://${domain}/search/?q={query}`,
                                },
                                query: 'required',
                                'query-input': 'required name=query',
                            },
                        }}
                    />
                </HeaderProvider>
            </AnalyticsProvider>
        </ProvidersRegistry>
    );
}
