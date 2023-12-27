import 'the-new-css-reset';

import '@/styles/app.scss';

import { ShopApi } from '@/api/shop';
import { ShopifyApiConfig, ShopifyApolloApiClient } from '@/api/shopify';
import { StoreApi } from '@/api/store';
import { PageProvider } from '@/components/layout/page-provider';
import PageContent from '@/components/page-content';
import ProvidersRegistry from '@/components/providers-registry';
import { getDictionary } from '@/i18n/dictionary';
import { BuildConfig } from '@/utils/build-config';
import { highlightConfig } from '@/utils/config/highlight';
import { CssVariablesProvider } from '@/utils/css-variables';
import { Error } from '@/utils/errors';
import { Locale } from '@/utils/locale';
import { HighlightInit } from '@highlight-run/next/client';
import type { Metadata, Viewport } from 'next';
import { Public_Sans } from 'next/font/google';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { Suspense } from 'react';

export const runtime = 'experimental-edge';
export const revalidate = 3600;
export const dynamic = 'force-static';

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    interactiveWidget: 'resizes-visual'
};

const fontPrimary = Public_Sans({
    weight: 'variable',
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-primary',
    preload: true
});

export type LayoutParams = { domain: string; locale: string };
export async function generateMetadata({ params: { domain, locale } }: { params: LayoutParams }): Promise<Metadata> {
    try {
        const shop = await ShopApi(domain);

        return {
            metadataBase: new URL(`https://${domain}/${locale}/`),
            title: {
                default: shop.name,
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
                index: BuildConfig.environment === 'production' ? true : false
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
            return notFound();
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
        if (!locale) return notFound();

        const shop = await ShopApi(domain);
        const apiConfig = await ShopifyApiConfig({ shop });
        const api = await ShopifyApolloApiClient({ shop, locale, apiConfig });

        const store = await StoreApi({ api });
        const i18n = await getDictionary(locale);

        return (
            <>
                <HighlightInit {...highlightConfig} serviceName={`Nordcom Commerce Storefront`} />
                <html
                    lang={locale.code}
                    className={`${fontPrimary.variable}`}
                    /* A bunch of extensions add classes to the `html` element. */
                    suppressHydrationWarning={true}
                >
                    <head>
                        <Suspense key={`${shop.id}.styling`}>
                            <CssVariablesProvider domain={domain} />
                        </Suspense>
                    </head>
                    <body suppressHydrationWarning={true}>
                        <ProvidersRegistry shop={shop} locale={locale} apiConfig={apiConfig.public()} store={store}>
                            <Suspense key={`${shop.id}.layout`} fallback={<PageProvider.skeleton />}>
                                <PageProvider shop={shop} locale={locale} i18n={i18n} store={store}>
                                    <PageContent as="main" primary={true}>
                                        <Suspense key={`${shop.id}.layout.page`} fallback={<PageProvider.skeleton />}>
                                            {children}
                                        </Suspense>
                                    </PageContent>
                                </PageProvider>
                            </Suspense>
                        </ProvidersRegistry>
                    </body>
                </html>
            </>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            return notFound();
        }

        throw error;
    }
}
