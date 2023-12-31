import 'the-new-css-reset';

import '@/styles/app.scss';

import { ShopApi } from '@/api/shop';
import { ShopifyApiConfig, ShopifyApolloApiClient } from '@/api/shopify';
import { LocaleApi } from '@/api/store';
import { AnalyticsProvider } from '@/components/analytics-provider';
import { HeaderProvider } from '@/components/header/header-provider';
import ShopLayout from '@/components/layout/shop-layout';
import PageContent from '@/components/page-content';
import ProvidersRegistry from '@/components/providers-registry';
import { getDictionary } from '@/i18n/dictionary';
import { highlightConfig } from '@/utils/config/highlight';
import { CssVariablesProvider, getBrandingColors } from '@/utils/css-variables';
import { Error } from '@/utils/errors';
import { Locale } from '@/utils/locale';
import { HighlightInit } from '@highlight-run/next/client';
import type { Metadata, Viewport } from 'next';
import { Public_Sans } from 'next/font/google';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { Suspense } from 'react';

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
        const shop = await ShopApi(domain);

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
                apple: ['/favicon.png']
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
        if (Error.isNotFound(error)) {
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
        if (!locale) notFound();

        const shop = await ShopApi(domain);
        const apiConfig = await ShopifyApiConfig({ shop });
        const api = await ShopifyApolloApiClient({ shop });

        const branding = await getBrandingColors(domain);
        const i18n = await getDictionary(locale);
        const localization = await LocaleApi({ api });

        return (
            <>
                <HighlightInit {...highlightConfig} serviceName={`Nordcom Commerce Storefront`} />
                <html
                    lang={locale.code}
                    className={fontPrimary.variable || undefined}
                    // A bunch of extensions add classes to the `html` element.
                    suppressHydrationWarning={true}
                >
                    <head>
                        <Suspense key={`${shop.id}.theme`}>
                            <CssVariablesProvider domain={domain} />
                        </Suspense>
                    </head>

                    <body suppressHydrationWarning={true}>
                        <ProvidersRegistry
                            shop={shop}
                            localization={localization || undefined}
                            locale={locale}
                            apiConfig={apiConfig.public()}
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
