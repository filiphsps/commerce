import { ShopApi } from '@/api/shop';
import { ShopifyApiClient, ShopifyApiConfig } from '@/api/shopify';
import { StoreApi } from '@/api/store';
import ProvidersRegistry from '@/components/providers-registry';
import { Locale } from '@/utils/locale';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    robots: {
        follow: false,
        index: false
    }
};

export default async function RootLayout({ children }: { children: ReactNode }) {
    const shop = await ShopApi({ domain: 'demo.nordcom.io' }); // TODO: Don't hardcode this.
    const locale = Locale.default;
    const shopifyApi = await ShopifyApiConfig({ shop });
    const api = await ShopifyApiClient({ shop, locale });
    const store = await StoreApi({ api });

    return (
        <html lang={locale.code}>
            <head />
            <body>
                <ProvidersRegistry shop={shop} locale={locale} apiConfig={shopifyApi.public()} store={store}>
                    {children}
                </ProvidersRegistry>
            </body>
        </html>
    );
}
