import '../../globals.css';

import type { OnlineShop } from '@nordcom/commerce-db';
import { Error, UnknownShopDomainError } from '@nordcom/commerce-errors';
import type { Viewport } from 'next';
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

export { generateMetadata } from './metadata';
export { generateStaticParams } from './static-params';

export const viewport: Viewport = {
    initialScale: 1,
    interactiveWidget: 'resizes-content',
    viewportFit: 'cover',
    width: 'device-width',
};

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
