import 'server-only';

import 'the-new-css-reset';
import '@/styles/app.scss';
import '@/styles/global.css';

import { Shop } from '@nordcom/commerce-db';

import { ShopifyApolloApiClient } from '@/api/shopify';
import { LocaleApi } from '@/api/store';
import { CssVariablesProvider } from '@/utils/css-variables';
import { primaryFont } from '@/utils/fonts';
import { Locale } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import { notFound } from 'next/navigation';

import { AnalyticsProvider } from '@/components/analytics-provider';
import { HeaderProvider } from '@/components/header/header-provider';
import ProvidersRegistry from '@/components/providers-registry';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;
export const preferredRegion = 'home';

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

    const shop = await Shop.findByDomain(domain);
    if (!shop) notFound();

    const api = await ShopifyApolloApiClient({ shop, locale });
    const localization = await LocaleApi({ api });

    return (
        <html
            lang={locale.code}
            className={cn(primaryFont.variable, 'overflow-x-hidden overscroll-x-none')}
            suppressHydrationWarning={true}
        >
            <head suppressHydrationWarning={true}>
                <CssVariablesProvider domain={domain} />
            </head>
            <body suppressHydrationWarning={true} className="group/body">
                <ProvidersRegistry
                    shop={shop}
                    currency={localization?.country.currency.isoCode}
                    locale={locale}
                    domain={domain}
                >
                    <AnalyticsProvider shop={shop}>
                        <HeaderProvider loaderColor="transparent">{children}</HeaderProvider>
                    </AnalyticsProvider>
                </ProvidersRegistry>
            </body>
        </html>
    );
}
