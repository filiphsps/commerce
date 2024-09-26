import 'server-only';

import '@/styles/app.scss';
import '../../globals.css';

import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';

import { ShopifyApolloApiClient } from '@/api/shopify';
import { LocaleApi } from '@/api/store';
import { CssVariablesProvider } from '@/utils/css-variables';
import { primaryFont } from '@/utils/fonts';
import { Locale } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import { notFound, unstable_rethrow } from 'next/navigation';

import { AnalyticsProvider } from '@/components/analytics-provider';
import { HeaderProvider } from '@/components/header/header-provider';
import PageContent from '@/components/page-content';
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

export type SliceSimulatorLayoutParams = Promise<{ domain: string }>;

export default async function SliceSimulatorLayout({
    children,
    params
}: {
    children: ReactNode;
    params: SliceSimulatorLayoutParams;
}) {
    const { domain } = await params;
    const locale = Locale.default;

    try {
        const shop = await Shop.findByDomain(domain, { sensitiveData: true });
        const publicShop = await Shop.findByDomain(domain);

        const api = await ShopifyApolloApiClient({ shop, locale });
        const localization = await LocaleApi({ api });

        return (
            <html lang={locale.code} className={cn(primaryFont.variable)}>
                <head>
                    <CssVariablesProvider domain={domain} />
                </head>

                <body className="group/body overflow-x-hidden overscroll-x-none">
                    <ProvidersRegistry
                        shop={publicShop}
                        currency={localization?.country.currency.isoCode}
                        locale={locale}
                        domain={domain}
                        toolbars={false}
                    >
                        <AnalyticsProvider shop={publicShop} enableThirdParty={false}>
                            <HeaderProvider loaderColor="transparent">
                                <PageContent primary>{children}</PageContent>
                            </HeaderProvider>
                        </AnalyticsProvider>
                    </ProvidersRegistry>
                </body>
            </html>
        );
    } catch (error: unknown) {
        console.error(error);
        if (Error.isNotFound(error)) {
            notFound();
        }

        console.error(error);
        unstable_rethrow(error);
        throw error;
    }
}
