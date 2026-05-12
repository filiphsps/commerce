import 'server-only';

import '@/styles/app.scss';
import '../../globals.css';

import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';
import type { Metadata } from 'next';
import { notFound, unstable_rethrow } from 'next/navigation';
import type { ReactNode } from 'react';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { LocaleApi } from '@/api/store';
import { AnalyticsProvider } from '@/components/analytics-provider';
import { HeaderProvider } from '@/components/header/header-provider';
import PageContent from '@/components/page-content';
import ProvidersRegistry from '@/components/providers-registry';
import { CssVariablesProvider } from '@/utils/css-variables';
import { primaryFont } from '@/utils/fonts';
import { Locale } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

export const metadata: Metadata = {
    robots: {
        follow: false,
        index: false,
    },
};

export type SliceSimulatorLayoutParams = Promise<{ domain: string }>;

export async function generateStaticParams(): Promise<Awaited<SliceSimulatorLayoutParams>[]> {
    const shops = await Shop.findAll();

    const params = (
        await Promise.all(
            shops.map(async ({ domain }) => {
                const shop = await Shop.findByDomain(domain, { sensitiveData: true });
                if (shop.contentProvider.type !== 'prismic') {
                    return null;
                }
                return { domain: shop.domain };
            }),
        )
    ).filter(Boolean) as Awaited<SliceSimulatorLayoutParams>[];

    // `rootParams: true` requires at least one entry. When no shop uses Prismic
    // we still need to satisfy the build; the runtime gate below 404s the route.
    if (params.length === 0) {
        return shops.slice(0, 1).map(({ domain }) => ({ domain }));
    }

    return params;
}

export default async function SliceSimulatorLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: SliceSimulatorLayoutParams;
}) {
    const { domain } = await params;
    const locale = Locale.default;

    let publicShop: Awaited<ReturnType<typeof Shop.findByDomain>>;
    let localization: Awaited<ReturnType<typeof LocaleApi>>;
    try {
        const shop = await Shop.findByDomain(domain, { sensitiveData: true });
        if (shop.contentProvider.type !== 'prismic') {
            notFound();
        }

        publicShop = await Shop.findByDomain(domain);

        const api = await ShopifyApolloApiClient({ shop, locale });
        localization = await LocaleApi({ api });
    } catch (error: unknown) {
        console.error(error);
        if (Error.isNotFound(error)) {
            notFound();
        }

        console.error(error);
        unstable_rethrow(error);
        throw error;
    }

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
}
