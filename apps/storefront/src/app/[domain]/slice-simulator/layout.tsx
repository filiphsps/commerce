import 'the-new-css-reset';
import '@/styles/app.scss';

import { unstable_cache as cache } from 'next/cache';
import { Public_Sans } from 'next/font/google';

import { ShopApi } from '@nordcom/commerce-database';

import { ShopifyApolloApiClient } from '@/api/shopify';
import { LocaleApi } from '@/api/store';
import { CssVariablesProvider } from '@/utils/css-variables';
import { Locale } from '@/utils/locale';

import { AnalyticsProvider } from '@/components/analytics-provider';
import ProvidersRegistry from '@/components/providers-registry';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const fontPrimary = Public_Sans({
    weight: 'variable',
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-primary',
    preload: true
});

export const metadata: Metadata = {
    robots: {
        follow: false,
        index: false
    }
};

export default async function RootLayout({
    children,
    params: { domain }
}: {
    children: ReactNode;
    params: { domain: string };
}) {
    const locale = Locale.default;

    const shop = await ShopApi(domain, cache);
    const api = await ShopifyApolloApiClient({ shop, locale });

    const localization = await LocaleApi({ api });

    return (
        <html lang={locale.code} className={`${fontPrimary.variable}`} suppressHydrationWarning={true}>
            <head>
                <CssVariablesProvider domain={domain} />
            </head>
            <body suppressHydrationWarning={true}>
                <ProvidersRegistry shop={shop} currency={localization?.country.currency.isoCode} locale={locale}>
                    <AnalyticsProvider shop={shop}>{children}</AnalyticsProvider>
                </ProvidersRegistry>
            </body>
        </html>
    );
}
