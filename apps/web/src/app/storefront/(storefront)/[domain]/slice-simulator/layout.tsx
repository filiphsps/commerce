import 'the-new-css-reset';

import '@/styles/app.scss';

import { ShopApi } from '@/api/shop';
import { ShopifyApiClient, ShopifyApiConfig } from '@/api/shopify';
import { StoreApi } from '@/api/store';
import ProvidersRegistry from '@/components/providers-registry';
import { CssVariablesProvider } from '@/utils/css-variables';
import { Locale } from '@/utils/locale';
import type { Metadata } from 'next';
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
    const shop = await ShopApi(domain);
    const locale = Locale.default;
    const shopifyApi = await ShopifyApiConfig({ shop });
    const api = await ShopifyApiClient({ shop, locale });
    const store = await StoreApi({ api });

    return (
        <html lang={locale.code} className={`${fontPrimary.variable}`} suppressHydrationWarning={true}>
            <head>
                <Suspense key={`${shop.id}.styling`}>
                    <CssVariablesProvider domain={domain} />
                </Suspense>
            </head>
            <body suppressHydrationWarning={true}>
                <ProvidersRegistry shop={shop} locale={locale} apiConfig={shopifyApi.public()} store={store}>
                    {children}
                </ProvidersRegistry>
            </body>
        </html>
    );
}
