import { ShopApi } from '@/api/shop';
import { StorefrontApiClient, shopifyApiConfig } from '@/api/shopify';
import { StoreApi } from '@/api/store';
import ProvidersRegistry from '@/components/providers-registry';
import { DefaultLocale } from '@/utils/locale';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Suspense } from 'react';

export const metadata: Metadata = {
    robots: {
        follow: false,
        index: false
    }
};

export default async function RootLayout({ children }: { children: ReactNode }) {
    const shop = await ShopApi({ domain: 'www.sweetsideofsweden.com' }); // TODO: Don't hardcode this.
    const locale = DefaultLocale();
    const shopifyApi = await shopifyApiConfig({ shop });
    const api = await StorefrontApiClient({ shop, locale });
    const store = await StoreApi({ api, locale });

    return (
        <html lang={locale.locale}>
            <head />
            <body>
                <ProvidersRegistry shop={shop} locale={locale} apiConfig={shopifyApi.public()} store={store}>
                    <Suspense>{children}</Suspense>
                </ProvidersRegistry>
            </body>
        </html>
    );
}
