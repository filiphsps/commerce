import '@/styles/app.scss';
import '../../globals.css';

import { Fragment, Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';
import { Shop } from '@nordcom/commerce-db';
import { Error, UnknownShopDomainError } from '@nordcom/commerce-errors';

import { findShopByDomainOverHttp } from '@/api/shop';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { CountriesApi, LocaleApi, LocalesApi } from '@/api/store';
import { getDictionary } from '@/i18n/dictionary';
import { CssVariablesProvider, getBrandingColors } from '@/utils/css-variables';
import { primaryFont } from '@/utils/fonts';
import { Locale } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import { notFound, unstable_rethrow } from 'next/navigation';

import { AnalyticsProvider } from '@/components/analytics-provider';
import { GeoRedirect } from '@/components/geo-redirect';
import { HeaderProvider } from '@/components/header/header-provider';
import { JsonLd } from '@/components/json-ld';
import ShopLayout from '@/components/layout/shop-layout';
import PageContent from '@/components/page-content';
import ProvidersRegistry from '@/components/providers-registry';

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const dynamicParams = true;
export const revalidate = false;
export const preferredRegion = 'home';

export type LayoutParams = Promise<{ domain: string; locale: string }>;

export async function generateStaticParams(): Promise<Awaited<LayoutParams>[]> {
    /** @note Limit pre-rendering when not in production. */
    if (process.env.VERCEL_ENV !== 'production') {
        return [];
    }

    const shops = await Shop.findAll();

    // const codes = await generatePermutations(precomputeFlags);

    return (
        await Promise.all(
            shops.map(async ({ domain }) => {
                try {
                    const shop = await findShopByDomainOverHttp(domain);
                    if (shop.domain.includes('demo')) {
                        return null as any as LayoutParams;
                    }

                    return [
                        {
                            domain: shop.domain,
                            locale: Locale.from('en-US').code
                        }
                    ];

                    /*try {
                        const api = await ShopifyApiClient({ shop });
                        const locales = await LocalesApi({ api });

                        return locales.map(({ code }) => ({
                            domain: shop.domain,
                            locale: code
                        }));
                    } catch {
                        return [];
                    }*/
                } catch (error: unknown) {
                    if (!Error.isNotFound(error)) {
                        console.error(error);
                    }

                    return [];
                }
            })
        )
    )
        .flat(1)
        .filter(Boolean);
}

export const viewport: Viewport = {
    initialScale: 1,
    interactiveWidget: 'resizes-content',
    viewportFit: 'cover',
    width: 'device-width'
};

export async function generateMetadata({ params }: { params: LayoutParams }): Promise<Metadata> {
    const { domain, locale: localeData } = await params;
    if (!localeData || !domain) {
        notFound();
    }

    let locale: Locale;
    try {
        locale = Locale.from(localeData);
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        console.error(error);
        unstable_rethrow(error);
        throw error;
    }

    let shop: OnlineShop;
    try {
        shop = await Shop.findByDomain(domain, { sensitiveData: true });
    } catch (error: unknown) {
        if (Error.isNotFound(error) || error instanceof UnknownShopDomainError) {
            notFound();
        }

        console.error(error);
        unstable_rethrow(error);
        throw error;
    }

    return {
        metadataBase: new URL(`https://${shop.domain}/${locale.code}/`),
        title: {
            absolute: `${shop.name} (${locale.country!})`.trim(),
            // Allow tenants to customize this.
            // For example allow them to use other separators
            // like `·`, `–`, `—` etc.
            template: `%s — ${shop.name} (${locale.country!})`
        },
        icons: {
            icon: ['/favicon.png'],
            shortcut: ['/favicon.png'],
            apple: ['/apple-icon.png']
        },
        robots: {
            follow: true,
            index: true
        },
        referrer: 'origin',
        formatDetection: {
            email: false,
            address: false,
            telephone: false
        },
        openGraph: {
            siteName: shop.name,
            locale: locale.code
        }
    };
}

export default async function RootLayout({ children, params }: { children: ReactNode; params: LayoutParams }) {
    const { domain, locale: localeData } = await params;
    if (!localeData || !domain) {
        notFound();
    }

    let locale: Locale;
    try {
        locale = Locale.from(localeData);
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        console.error(error);
        unstable_rethrow(error);
        throw error;
    }

    let shop: OnlineShop, publicShop: OnlineShop;
    try {
        shop = await Shop.findByDomain(domain, { sensitiveData: true });
        publicShop = await Shop.findByDomain(domain);
    } catch (error: unknown) {
        if (Error.isNotFound(error) || error instanceof UnknownShopDomainError) {
            notFound();
        }

        console.error(error);
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

        console.error(error);
        unstable_rethrow(error);
        throw error;
    }

    // Make sure that the current locale is a valid and active locale.
    if (!locales.map((locale) => locale.code).includes(locale.code)) {
        notFound();
    }

    const localization = await LocaleApi({ api });
    const countries = await CountriesApi({ api });

    const branding = await getBrandingColors({ domain, shop });
    const i18n = await getDictionary(locale);

    return (
        <html lang={locale.code} className={cn(primaryFont.className, primaryFont.variable, 'overscroll-x-none')}>
            <head>
                <Suspense fallback={<Fragment />}>
                    <CssVariablesProvider domain={domain} />
                </Suspense>
            </head>

            <body className="group/body overflow-x-hidden overscroll-x-none">
                <ProvidersRegistry
                    shop={publicShop}
                    currency={localization?.country.currency.isoCode}
                    locale={locale}
                    domain={domain}
                >
                    <AnalyticsProvider shop={publicShop} hostname={domain}>
                        <HeaderProvider loaderColor={branding?.primary.color}>
                            <Suspense key="layout.geo-redirect" fallback={<Fragment />}>
                                <GeoRedirect shop={publicShop} countries={countries} locale={locale} i18n={i18n} />
                            </Suspense>

                            <Suspense key="layout.shop-layout" fallback={<ShopLayout.skeleton />}>
                                <ShopLayout shop={shop} locale={locale} i18n={i18n}>
                                    <PageContent as="article" primary={true}>
                                        {children}
                                    </PageContent>
                                </ShopLayout>
                            </Suspense>
                        </HeaderProvider>
                    </AnalyticsProvider>
                </ProvidersRegistry>

                {/* Metadata */}
                <JsonLd
                    data={{
                        '@context': 'http://schema.org',
                        '@type': 'WebSite',
                        'url': `https://${shop.domain}/${locale.code}/`,
                        'name': shop.name,
                        'potentialAction': {
                            '@type': 'SearchAction',
                            'target': {
                                '@type': 'EntryPoint',
                                'urlTemplate': `https://${domain}/search/?q={query}`
                            },
                            'query': 'required',
                            'query-input': 'required name=query'
                        }
                    }}
                />
            </body>
        </html>
    );
}
