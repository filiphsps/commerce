import 'the-new-css-reset';

import '@/styles/app.scss';

import { ShopifyApiConfig } from '@/api/shopify';
import ProvidersRegistry from '@/components/providers-registry';
import { CssVariablesProvider } from '@/utils/css-variables';
import { Locale } from '@/utils/locale';
import { ShopApi } from '@nordcom/commerce-database';
import type { Metadata } from 'next';
import { unstable_cache as cache } from 'next/cache';
import { Public_Sans } from 'next/font/google';
import { Suspense, type ReactNode } from 'react';

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
    const shop = await ShopApi(domain, cache);
    const locale = Locale.default;
    const shopifyApi = await ShopifyApiConfig({ shop });

    return (
        <html lang={locale.code} className={`${fontPrimary.variable}`} suppressHydrationWarning={true}>
            <head>
                <Suspense key={`${shop.id}.styling`}>
                    <CssVariablesProvider domain={domain} />
                </Suspense>
            </head>
            <body suppressHydrationWarning={true}>
                <ProvidersRegistry shop={shop} locale={locale} apiConfig={shopifyApi.public()}>
                    {children}
                </ProvidersRegistry>
            </body>
        </html>
    );
}
