import 'the-new-css-reset';
import '@/styles/app.scss';
import '@/styles/global.css';

import { type ReactNode, Suspense } from 'react';

import { Shop } from '@nordcom/commerce-db';
import { Error, UnknownShopDomainError } from '@nordcom/commerce-errors';

import { ShopifyApiClient, ShopifyApolloApiClient } from '@/api/shopify';
import { CountriesApi, LocaleApi, LocalesApi } from '@/api/store';
import { getDictionary } from '@/i18n/dictionary';
import { CssVariablesProvider, getBrandingColors } from '@/utils/css-variables';
import { primaryFont } from '@/utils/fonts';
import { Locale } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import { notFound } from 'next/navigation';

import { AnalyticsProvider } from '@/components/analytics-provider';
import { GeoRedirect } from '@/components/geo-redirect';
import { HeaderProvider } from '@/components/header/header-provider';
import { JsonLd } from '@/components/json-ld';
import ShopLayout from '@/components/layout/shop-layout';
import PageContent from '@/components/page-content';
import ProvidersRegistry from '@/components/providers-registry';

import type { Metadata, Viewport } from 'next';

export const runtime = 'nodejs';
export const dynamic = 'auto';
export const dynamicParams = true;
export const revalidate = false;
export const preferredRegion = 'home';

export type LayoutParams = { domain: string; locale: string };

export async function generateStaticParams(): Promise<LayoutParams[]> {
    const shops = await Shop.findAll();

    // const codes = await generatePermutations(precomputeFlags);

    return (
        await Promise.all(
            shops.map(async ({ domain }) => {
                const shop = await Shop.findByDomain(domain, { sensitiveData: true });
                if (shop.domain.includes('demo')) {
                    return null as any as LayoutParams;
                }
                const api = await ShopifyApiClient({ shop });
                const locales = await LocalesApi({ api });

                return locales.map(({ code }) => ({
                    domain: shop.domain,
                    locale: code
                }));
            })
        )
    )
        .flat(1)
        .filter(Boolean);
}

export async function generateViewport({ params: { domain } }: { params: LayoutParams }): Promise<Viewport> {
    const branding = await getBrandingColors(domain);

    return {
        width: 'device-width',
        initialScale: 1,
        interactiveWidget: 'resizes-content',
        themeColor: branding?.secondary.color
    };
}

export async function generateMetadata({
    params: { domain, locale: localeData }
}: {
    params: LayoutParams;
}): Promise<Metadata> {
    try {
        const locale = Locale.from(localeData);
        const shop = await Shop.findByDomain(domain, { sensitiveData: true });

        return {
            metadataBase: new URL(`https://${shop.domain}/${locale.code}/`),
            title: {
                absolute: `${shop.name} ${locale.country!}`.trim()
                // Allow tenants to customize this.
                // For example allow them to use other separators
                // like `·`, `—` etc.
                // template: `%s - ${shop.name} ${locale.country!}`
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
            }
        };
    } catch (error: unknown) {
        if (Error.isNotFound(error) || error instanceof UnknownShopDomainError) {
            notFound();
        }

        throw error;
    }
}

export default async function RootLayout({
    children,
    params: { domain, locale: localeData }
}: {
    children: ReactNode;
    params: LayoutParams;
}) {
    try {
        const locale = Locale.from(localeData);

        const shop = await Shop.findByDomain(domain, { sensitiveData: true });
        const publicShop = await Shop.findByDomain(domain);
        const api = await ShopifyApolloApiClient({ shop, locale });

        const branding = await getBrandingColors(domain);
        const i18n = await getDictionary(locale);
        const localization = await LocaleApi({ api });

        const countries = await CountriesApi({ api });

        return (
            <html lang={locale.code} className={cn(primaryFont.className, primaryFont.variable, 'overscroll-x-none')}>
                <head>
                    <Suspense>
                        <CssVariablesProvider domain={domain} />
                    </Suspense>
                </head>

                <body className="group/body overflow-x-hidden overscroll-x-none">
                    <Suspense fallback={<ShopLayout.skeleton />}>
                        <ProvidersRegistry
                            shop={publicShop}
                            currency={localization?.country.currency.isoCode}
                            locale={locale}
                            domain={domain}
                        >
                            <AnalyticsProvider shop={publicShop}>
                                <HeaderProvider loaderColor={branding?.primary.color || ''}>
                                    <ShopLayout shop={shop} locale={locale} i18n={i18n}>
                                        <PageContent as="main" primary={true}>
                                            {children}
                                        </PageContent>
                                    </ShopLayout>

                                    <Suspense>
                                        <GeoRedirect countries={countries} locale={locale} />
                                    </Suspense>
                                </HeaderProvider>
                            </AnalyticsProvider>
                        </ProvidersRegistry>
                    </Suspense>

                    {/* Metadata */}
                    <JsonLd
                        data={{
                            '@context': 'http://schema.org',
                            '@type': 'WebSite',
                            'url': `https://${shop.domain}/${locale.code}/`,
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
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}
