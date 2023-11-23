import { ShopApi } from '@/api/shop';
import { StorefrontApiClient, shopifyApiConfig } from '@/api/shopify';
import { StoreApi } from '@/api/store';
import ProvidersRegistry from '@/components/providers-registry';
import { DefaultLocale } from '@/utils/locale';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    robots: {
        follow: false,
        index: false
    }
};

export default async function RootLayout({ children }: { children: ReactNode }) {
    const shop = await ShopApi({ domain: 'demo.nordcom.io' }); // TODO: Don't hardcode this.
    const locale = DefaultLocale();
    const shopifyApi = await shopifyApiConfig({ shop });
    const api = await StorefrontApiClient({ shop, locale });
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
