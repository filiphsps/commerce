import 'the-new-css-reset';
import '@/styles/app.scss';
import '@/styles/global.css';

import { type ReactNode, Suspense } from 'react';

import { Shop } from '@nordcom/commerce-db';
import { Error, UnknownShopDomainError } from '@nordcom/commerce-errors';

import { ShopifyApiClient, ShopifyApiConfig, ShopifyApolloApiClient } from '@/api/shopify';
import { LocaleApi, LocalesApi } from '@/api/store';
import { getDictionary } from '@/i18n/dictionary';
import { CssVariablesProvider, getBrandingColors } from '@/utils/css-variables';
import { primaryFont } from '@/utils/fonts';
import { Locale } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import { notFound } from 'next/navigation';

import { AnalyticsProvider } from '@/components/analytics-provider';
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

    return (
        await Promise.all(
            shops.map(async ({ domain }) => {
                const shop = await Shop.findByDomain(domain);
                if (shop.domain.includes('demo')) {
                    return null as any as LayoutParams;
                }

                const apiConfig = await ShopifyApiConfig({ shop });
                const api = await ShopifyApiClient({ shop, apiConfig });
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
        interactiveWidget: 'resizes-visual',
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
        const shop = await Shop.findByDomain(domain);

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

        const shop = await Shop.findByDomain(domain);
        const api = await ShopifyApolloApiClient({ shop, locale });

        const branding = await getBrandingColors(domain);
        const i18n = await getDictionary(locale);
        const localization = await LocaleApi({ api });

        return (
            <html
                lang={locale.code}
                className={cn(primaryFont.variable, 'overscroll-x-none')}
                // A bunch of extensions add classes to the `html` element.
                suppressHydrationWarning={true}
            >
                <head suppressHydrationWarning={true}>
                    <Suspense fallback={null}>
                        <CssVariablesProvider domain={domain} />
                    </Suspense>
                </head>

                <body suppressHydrationWarning={true} className="group/body overflow-x-hidden overscroll-x-none">
                    <ProvidersRegistry
                        shop={shop}
                        currency={localization?.country.currency.isoCode}
                        locale={locale}
                        domain={domain}
                    >
                        <AnalyticsProvider shop={shop}>
                            <HeaderProvider loaderColor={branding?.primary.color || ''}>
                                <ShopLayout shop={shop} locale={locale} i18n={i18n}>
                                    <PageContent as="main" primary={true}>
                                        {children}
                                    </PageContent>
                                </ShopLayout>
                            </HeaderProvider>
                        </AnalyticsProvider>
                    </ProvidersRegistry>

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
