import '@/styles/app.scss';
import '../../globals.css';

import type { OnlineShop } from '@nordcom/commerce-db';
import { Error, UnknownShopDomainError } from '@nordcom/commerce-errors';
import { trace } from '@opentelemetry/api';
import type { Metadata, Viewport } from 'next';
import { cacheLife } from 'next/cache';
import { notFound, unstable_rethrow } from 'next/navigation';
import type { ReactNode } from 'react';
import { Fragment, Suspense } from 'react';
import { CountriesApi, LocaleApi, LocalesApi, Shop } from '@/api/_loaders';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { AnalyticsProvider } from '@/components/analytics-provider';
import { GeoRedirect } from '@/components/geo-redirect';
import { HeaderProvider } from '@/components/header/header-provider';
import { JsonLd } from '@/components/json-ld';
import ShopLayout from '@/components/layout/shop-layout';
import PageContent from '@/components/page-content';
import ProvidersRegistry from '@/components/providers-registry';
import { getDictionary } from '@/i18n/dictionary';
import { CssVariablesProvider, getBrandingColors } from '@/utils/css-variables';
import { primaryFont } from '@/utils/fonts';
import { NOT_FOUND_HANDLE } from '@/utils/handle';
import { Locale } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

export type LayoutParams = Promise<{ domain: string; locale: string }>;

export async function generateStaticParams(): Promise<Awaited<LayoutParams>[]> {
    try {
        const shops = await Shop.findAll();

        const params = (
            await Promise.all(
                shops.map(async ({ domain }) => {
                    let shop: OnlineShop;
                    try {
                        shop = await Shop.findByDomain(domain, { sensitiveData: true });
                    } catch (error: unknown) {
                        trace.getActiveSpan()?.addEvent('static_params.shop_lookup_failed', {
                            'shop.domain': domain,
                            'error.message': (error as Error)?.message ?? String(error),
                        });
                        return null as unknown as LayoutParams;
                    }
                    if (shop.domain.includes('demo')) {
                        return null as unknown as LayoutParams;
                    }

                    return [
                        {
                            domain: shop.domain,
                            locale: Locale.from('en-US').code,
                        },
                    ];
                }),
            )
        )
            .flat(1)
            .filter(Boolean);

        return params.length > 0 ? params : [{ domain: NOT_FOUND_HANDLE, locale: Locale.default.code }];
    } catch (error: unknown) {
        trace.getActiveSpan()?.addEvent('static_params.shop_findall_failed', {
            'error.message': (error as Error)?.message ?? String(error),
        });
        return [{ domain: NOT_FOUND_HANDLE, locale: Locale.default.code }];
    }
}

export const viewport: Viewport = {
    initialScale: 1,
    interactiveWidget: 'resizes-content',
    viewportFit: 'cover',
    width: 'device-width',
};

export async function generateMetadata({ params }: { params: LayoutParams }): Promise<Metadata> {
    'use cache';
    cacheLife('max');

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

    let shop: OnlineShop;
    try {
        shop = await Shop.findByDomain(domain, { sensitiveData: true });
    } catch (error: unknown) {
        if (Error.isNotFound(error) || error instanceof UnknownShopDomainError) {
            notFound();
        }

        unstable_rethrow(error);
        throw error;
    }

    return {
        // Next 16: URL objects fail React-server-to-client serialization. Runtime
        // accepts strings; TS Metadata type lags. Cast is intentional.
        metadataBase: `https://${shop.domain}/${locale.code}/` as unknown as URL,
        title: {
            absolute: `${shop.name} (${locale.country!})`.trim(),
            // Allow tenants to customize this.
            // For example allow them to use other separators
            // like `·`, `–`, `—` etc.
            template: `%s — ${shop.name} (${locale.country!})`,
        },
        icons: {
            icon: ['/favicon.png'],
            shortcut: ['/favicon.png'],
            apple: ['/apple-icon.png'],
        },
        robots: {
            follow: true,
            index: true,
        },
        referrer: 'origin',
        formatDetection: {
            email: false,
            address: false,
            telephone: false,
        },
        openGraph: {
            siteName: shop.name,
            locale: locale.code,
        },
    };
}

export default async function RootLayout({
    children,
    modal,
    params,
}: Readonly<{ children: ReactNode; modal: ReactNode; params: LayoutParams }>) {
    'use cache';
    cacheLife('max');

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

    let shop: OnlineShop, publicShop: OnlineShop;
    try {
        [shop, publicShop] = await Promise.all([
            Shop.findByDomain(domain, { sensitiveData: true }),
            Shop.findByDomain(domain),
        ]);
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

    const [localization, countries, branding, i18n] = await Promise.all([
        LocaleApi({ api }),
        CountriesApi({ api }),
        getBrandingColors({ domain, shop }),
        getDictionary(locale),
    ]);

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
                            {modal}

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
            </body>
        </html>
    );
}
