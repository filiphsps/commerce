import '@/styles/app.scss';
import 'the-new-css-reset';

import { SocialProfileJsonLd } from 'next-seo';
import { unstable_cache as cache } from 'next/cache';
import { Public_Sans } from 'next/font/google';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { ShopApi } from '@nordcom/commerce-database';
import { Error, UnknownShopDomainError } from '@nordcom/commerce-errors';

import { ShopifyApolloApiClient } from '@/api/shopify';
import { LocaleApi } from '@/api/store';
import { getDictionary } from '@/i18n/dictionary';
import { CssVariablesProvider, getBrandingColors } from '@/utils/css-variables';
import { Locale } from '@/utils/locale';

import { AnalyticsProvider } from '@/components/analytics-provider';
import { HeaderProvider } from '@/components/header/header-provider';
import ShopLayout from '@/components/layout/shop-layout';
import PageContent from '@/components/page-content';
import ProvidersRegistry from '@/components/providers-registry';

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

//export const runtime = 'experimental-edge';
export const revalidate = 28_800; // 8hrs.
export const dynamic = 'force-static';

const fontPrimary = Public_Sans({
    weight: 'variable',
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-primary',
    preload: true
});

export type LayoutParams = { domain: string; locale: string };

export async function generateViewport({ params: { domain } }: { params: LayoutParams }): Promise<Viewport> {
    const branding = await getBrandingColors(domain);

    return {
        width: 'device-width',
        initialScale: 1,
        interactiveWidget: 'resizes-visual',
        themeColor: branding.secondary.accent
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
        const api = await ShopifyApolloApiClient({ shop });

        const branding = await getBrandingColors(domain);
        const i18n = await getDictionary(locale);
        const localization = await LocaleApi({ api });

        return (
            <>
                <html
                    lang={locale.code}
                    className={fontPrimary.variable || ''}
                    // A bunch of extensions add classes to the `html` element.
                    suppressHydrationWarning={true}
                >
                    <head suppressHydrationWarning={true}>
                        <Suspense key={`${shop.id}.theme`}>
                            <CssVariablesProvider domain={domain} />
                        </Suspense>
                    </head>

                    <body suppressHydrationWarning={true}>
                        <ProvidersRegistry
                            shop={shop}
                            currency={localization?.country.currency.isoCode || 'USD'}
                            locale={locale}
                        >
                            <AnalyticsProvider shop={shop}>
                                <Suspense key={`${shop.id}.layout.shop`} fallback={<ShopLayout.skeleton />}>
                                    <ShopLayout shop={shop} locale={locale} i18n={i18n}>
                                        <PageContent as="main" primary={true}>
                                            {children}
                                        </PageContent>
                                    </ShopLayout>
                                </Suspense>
                            </AnalyticsProvider>

                            <HeaderProvider loaderColor={branding.primary.accent} />
                        </ProvidersRegistry>

                        <SocialProfileJsonLd
                            // TODO: Get all of this dynamically.
                            useAppDir={true}
                            type="Organization"
                            name={shop.name}
                            url={`https://${shop.domain}/${locale}/`}
                            logo={shop.icons?.favicon?.src}
                            foundingDate="2023"
                            founders={[
                                {
                                    '@type': 'Person',
                                    name: 'Dennis Sahlin',
                                    email: 'dennis@nordcom.io',
                                    jobTitle: 'Chief Executive Officer'
                                },
                                {
                                    '@type': 'Person',
                                    name: 'Filiph Siitam Sandström',
                                    email: 'filiph@nordcom.io',
                                    jobTitle: 'Chief Technology Officer'
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
                        />
                    </body>
                </html>
            </>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}
