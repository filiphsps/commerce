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
import CartHydrator from '@/components/cart/cart-hydrator';
import { NordcomCartProvider } from '@/components/cart/provider';
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

    return (
        <html lang={locale.code} className={cn(primaryFont.className, primaryFont.variable, 'overscroll-x-none')}>
            <head />
            <body className="group/body overflow-x-hidden overscroll-x-none">
                <NordcomCartProvider>
                    <Suspense fallback={null}>
                        <CartHydrator />
                    </Suspense>

                    <CachedShell domain={domain} locale={locale} modal={modal}>
                        {children}
                    </CachedShell>
                </NordcomCartProvider>
            </body>
        </html>
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
