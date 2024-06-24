import 'the-new-css-reset';
import '@/styles/app.scss';

import { type ReactNode, Suspense } from 'react';
import { unstable_cache as cache } from 'next/cache';
import { notFound } from 'next/navigation';

import { ShopApi, ShopsApi } from '@nordcom/commerce-database';
import { Error, UnknownShopDomainError } from '@nordcom/commerce-errors';

import { ShopifyApiClient, ShopifyApiConfig, ShopifyApolloApiClient } from '@/api/shopify';
import { LocaleApi, LocalesApi } from '@/api/store';
import { getDictionary } from '@/i18n/dictionary';
import { CssVariablesProvider, getBrandingColors } from '@/utils/css-variables';
import { primaryFont } from '@/utils/fonts';
import { Locale } from '@/utils/locale';

import { AnalyticsProvider } from '@/components/analytics-provider';
import { HeaderProvider } from '@/components/header/header-provider';
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
    const shops = await ShopsApi(cache);

    return (
        await Promise.all(
            shops.map(async ({ domain }) => {
                const shop = await ShopApi(domain, cache, true);
                const apiConfig = await ShopifyApiConfig({ shop, noHeaders: true });
                const api = await ShopifyApiClient({ shop, apiConfig });
                const locales = await LocalesApi({ api });

                return locales.map(({ code }) => ({
                    domain: shop.domain,
                    locale: code
                }));
            })
        )
    ).flat(1);
}

export async function generateViewport({ params: { domain } }: { params: LayoutParams }): Promise<Viewport> {
    const branding = await getBrandingColors(domain);

    return {
        width: 'device-width',
        initialScale: 1,
        interactiveWidget: 'resizes-visual',
        themeColor: branding?.secondary.color
    };
}

export async function generateMetadata({ params: { domain, locale } }: { params: LayoutParams }): Promise<Metadata> {
    try {
        const shop = await ShopApi(domain, cache);

        return {
            metadataBase: new URL(`https://${shop.domain}/${locale}/`),
            title: {
                absolute: shop.name,
                // Allow tenants to customize this.
                // For example allow them to use other separators
                // like `·`, `—` etc.
                template: `%s - ${shop.name}`
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

        const shop = await ShopApi(domain, cache);
        const api = await ShopifyApolloApiClient({ shop, locale });

        const branding = await getBrandingColors(domain);
        const i18n = await getDictionary(locale);
        const localization = await LocaleApi({ api });

        return (
            <html
                lang={locale.code}
                className={primaryFont.variable}
                // A bunch of extensions add classes to the `html` element.
                suppressHydrationWarning={true}
            >
                <head suppressHydrationWarning={true}>
                    <Suspense fallback={null}>
                        <CssVariablesProvider domain={domain} />
                    </Suspense>
                </head>

                <body suppressHydrationWarning={true}>
                    <ProvidersRegistry shop={shop} currency={localization?.country.currency.isoCode} locale={locale}>
                        <AnalyticsProvider shop={shop}>
                            <ShopLayout shop={shop} locale={locale} i18n={i18n}>
                                <PageContent as="main" primary={true}>
                                    {children}
                                </PageContent>
                            </ShopLayout>

                            <HeaderProvider loaderColor={branding?.primary.color || ''} />
                        </AnalyticsProvider>
                    </ProvidersRegistry>

                    {/*<SocialProfileJsonLd
                        // TODO: Get all of this dynamically.
                        useAppDir={true}
                        type="Organization"
                        name={shop.name}
                        url={`https://${shop.domain}/${locale.code}/`}
                        logo={shop.icons?.favicon?.src}
                        foundingDate="2023"
                        founders={[
                            {
                                '@type': 'Person',
                                name: 'Marcel Sobolewski',
                                email: 'marcel@nordcom.io',
                                jobTitle: 'Interim Chief Executive Officer'
                            },
                            {
                                '@type': 'Person',
                                name: 'Filiph Siitam Sandström',
                                email: 'filiph@nordcom.io',
                                jobTitle: 'Chief Technology Officer'
                            },
                            {
                                '@type': 'Person',
                                name: 'Dennis Sahlin',
                                email: 'dennis@nordcom.io',
                                jobTitle: 'Founder'
                            },
                            {
                                '@type': 'Person',
                                name: 'Albin Dahlqvist',
                                email: 'albin@nordcom.io',
                                jobTitle: 'Founder'
                            }
                        ]}
                        address={{
                            '@type': 'PostalAddress',
                            streetAddress: 'Sädesbingen 20 lgh 1301',
                            addressLocality: 'Trollhättan',
                            addressRegion: 'Västra Götaland',
                            postalCode: '461 61',
                            addressCountry: 'Sweden'
                        }}
                        sameAs={[]}
                    />*/}
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
